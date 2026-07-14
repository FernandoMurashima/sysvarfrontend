import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Caixa } from '../../core/models/caixa';
import { ContaBancaria } from '../../core/models/conta-bancaria';
import { FormaPagamento } from '../../core/models/forma-pagamento';
import { Loja } from '../../core/models/loja';
import { MovimentacaoFinanceira } from '../../core/models/movimentacao-financeira';
import { CaixasService } from '../../core/services/caixas.service';
import { ContasBancariasService } from '../../core/services/contas-bancarias.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { LojasService } from '../../core/services/lojas.service';
import { MovimentacoesFinanceirasService } from '../../core/services/movimentacoes-financeiras.service';
import { AuthService } from '../../core/auth.service';

type DestinoTipo = 'CAIXA' | 'CONTA';

@Component({
  selector: 'app-contas-bancarias',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './contas-bancarias.component.html',
  styleUrls: ['./contas-bancarias.component.css']
})
export class ContasBancariasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ContasBancariasService);
  private caixasApi = inject(CaixasService);
  private formasApi = inject(FormasPagamentoService);
  private lojasApi = inject(LojasService);
  private movsApi = inject(MovimentacoesFinanceirasService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  transferindo = false;
  showForm = false;
  editingId: number | null = null;
  search = '';
  lojasFiltro: number[] = [];
  errorMsg = '';
  successMsg = '';

  contas: ContaBancaria[] = [];
  contasTodas: ContaBancaria[] = [];
  caixas: Caixa[] = [];
  formasPagamento: FormaPagamento[] = [];
  lojas: Loja[] = [];
  movimentacoes: MovimentacaoFinanceira[] = [];
  selectedContaId: number | null = null;
  dataIni = '';
  dataFim = '';
  conciliacaoForma = '';
  conciliacaoData = this.today();
  conciliacaoPendentes: MovimentacaoFinanceira[] = [];
  conciliacaoSelecionados: Record<number, boolean> = {};
  conciliacaoLoteModal: {
    data_conciliacao: string;
    quantidade: number;
    total: number;
  } | null = null;
  carregandoConciliacao = false;
  conciliandoLote = false;
  conciliacaoModal: {
    mov: MovimentacaoFinanceira;
    data_conciliacao: string;
    valor_conciliado: number;
  } | null = null;
  desfazerModal: MovimentacaoFinanceira | null = null;
  excluirModal: ContaBancaria | null = null;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('financeiro', true) !== false;
  }

  form = this.fb.group({
    idloja: [null as number | null, Validators.required],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    banco: ['', [Validators.required, Validators.maxLength(80)]],
    agencia: ['', [Validators.required, Validators.maxLength(20)]],
    conta: ['', [Validators.required, Validators.maxLength(30)]],
    tipo_conta: ['CORRENTE', Validators.required],
    pix_chave: [''],
    saldo_inicial: [0, Validators.required],
    saldo_atual: [0, Validators.required],
    ativo: [true]
  });

  transferenciaForm = this.fb.group({
    origem_tipo: ['CAIXA' as DestinoTipo, Validators.required],
    origem_id: [null as number | null, Validators.required],
    destino_tipo: ['CONTA' as DestinoTipo, Validators.required],
    destino_id: [null as number | null, Validators.required],
    documento: ['', Validators.maxLength(50)],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    data_movimento: [this.today(), Validators.required],
    observacao: ['']
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list(),
      caixas: this.caixasApi.list({ ativo: true }),
      contas: this.api.list(),
      formas: this.formasApi.list({ ativo: true })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.caixas = this.unwrap<Caixa>(res.caixas);
        this.contasTodas = this.unwrap<ContaBancaria>(res.contas);
        this.formasPagamento = this.unwrap<FormaPagamento>(res.formas);
        if (!this.conciliacaoForma) {
          this.conciliacaoForma = this.formasPagamento.find(f => f.gera_recebivel_bancario)?.codigo || this.formasPagamento[0]?.codigo || '';
        }
        this.filtrarContas();
        if (!this.selectedContaId || !this.contas.some(c => c.Idconta === this.selectedContaId)) {
          this.selectedContaId = this.contas[0]?.Idconta ?? null;
        }
        this.sincronizarTransferencia();
        this.loading = false;
        this.loadMovimentacoes();
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar contas bancárias.';
      }
    });
  }

  loadMovimentacoes(): void {
    if (!this.selectedContaId) {
      this.movimentacoes = [];
      return;
    }
    this.movsApi.list({
      conta_bancaria: this.selectedContaId,
      data_ini: this.dataIni,
      data_fim: this.dataFim,
      page_size: 5000
    }).subscribe({
      next: res => this.movimentacoes = this.unwrap<MovimentacaoFinanceira>(res),
      error: () => this.errorMsg = 'Falha ao carregar extrato bancário.'
    });
  }

  selecionarConta(conta: ContaBancaria): void {
    this.selectedContaId = conta.Idconta ?? null;
    this.sincronizarTransferencia();
    this.loadMovimentacoes();
    this.limparConciliacaoPendentes();
  }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.form.reset({
      idloja: this.lojas[0]?.id ?? null,
      descricao: '',
      banco: '',
      agencia: '',
      conta: '',
      tipo_conta: 'CORRENTE',
      pix_chave: '',
      saldo_inicial: 0,
      saldo_atual: 0,
      ativo: true
    });
  }

  editar(item: ContaBancaria): void {
    this.showForm = true;
    this.editingId = item.Idconta ?? null;
    this.form.reset({
      idloja: item.idloja,
      descricao: item.descricao,
      banco: item.banco,
      agencia: item.agencia,
      conta: item.conta,
      tipo_conta: item.tipo_conta,
      pix_chave: item.pix_chave ?? '',
      saldo_inicial: Number(item.saldo_inicial),
      saldo_atual: Number(item.saldo_atual),
      ativo: item.ativo
    });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.errorMsg = 'Revise os campos obrigatórios.';
      return;
    }
    const raw = this.form.value;
    const payload: Partial<ContaBancaria> = {
      idloja: Number(raw.idloja),
      descricao: String(raw.descricao || '').trim(),
      banco: String(raw.banco || '').trim(),
      agencia: String(raw.agencia || '').trim(),
      conta: String(raw.conta || '').trim(),
      tipo_conta: raw.tipo_conta as any,
      pix_chave: String(raw.pix_chave || '').trim() || null,
      saldo_inicial: Number(raw.saldo_inicial || 0),
      saldo_atual: Number(raw.saldo_atual || 0),
      ativo: !!raw.ativo
    };
    this.saving = true;
    const req = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Conta bancária salva.';
        this.cancelar();
        this.loadAll();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao salvar conta bancária.';
      }
    });
  }

  excluir(item: ContaBancaria): void {
    if (!item.Idconta) return;
    this.excluirModal = item;
  }

  confirmarExclusao(): void {
    const id = this.excluirModal?.Idconta;
    if (!id) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Conta bancária excluída.';
        this.excluirModal = null;
        this.loadAll();
      },
      error: () => this.errorMsg = 'Falha ao excluir conta bancária.'
    });
  }

  cancelarExclusao(): void {
    this.excluirModal = null;
  }

  cancelar(): void {
    this.showForm = false;
    this.editingId = null;
  }

  transferir(): void {
    this.errorMsg = '';
    this.successMsg = '';
    if (this.transferenciaForm.invalid) {
      this.transferenciaForm.markAllAsTouched();
      this.errorMsg = 'Revise origem, destino, valor e data da transferência.';
      return;
    }
    const raw = this.transferenciaForm.value;
    if (raw.origem_tipo === raw.destino_tipo && raw.origem_id === raw.destino_id) {
      this.errorMsg = 'Origem e destino devem ser diferentes.';
      return;
    }
    this.transferindo = true;
    this.api.transferir({
      origem_tipo: raw.origem_tipo as DestinoTipo,
      origem_id: Number(raw.origem_id),
      destino_tipo: raw.destino_tipo as DestinoTipo,
      destino_id: Number(raw.destino_id),
      documento: String(raw.documento || '').trim() || null,
      valor: Number(raw.valor || 0),
      data_movimento: String(raw.data_movimento || this.today()),
      observacao: String(raw.observacao || '').trim() || null
    }).subscribe({
      next: res => {
        this.transferindo = false;
        this.successMsg = `Transferência registrada: ${res?.documento || ''}`.trim();
        this.transferenciaForm.patchValue({ documento: '', valor: 0, observacao: '' });
        this.loadAll();
      },
      error: err => {
        this.transferindo = false;
        this.errorMsg = err?.error?.detail || 'Falha ao registrar transferência.';
      }
    });
  }

  conciliar(mov: MovimentacaoFinanceira): void {
    this.conciliacaoModal = {
      mov,
      data_conciliacao: this.today(),
      valor_conciliado: Number(mov.valor || 0)
    };
  }

  confirmarConciliacao(): void {
    if (!this.conciliacaoModal?.mov.Idmovimentacao) return;
    const id = this.conciliacaoModal.mov.Idmovimentacao;
    const data = this.conciliacaoModal.data_conciliacao;
    const valor = Number(this.conciliacaoModal.valor_conciliado || 0);
    if (!data || !valor || valor <= 0) {
      this.errorMsg = 'Informe data e valor conciliado válidos.';
      return;
    }
    this.errorMsg = '';
    this.successMsg = '';
    this.movsApi.conciliar(id, { data_conciliacao: data, valor_conciliado: valor }).subscribe({
      next: () => {
        this.conciliacaoModal = null;
        this.successMsg = 'Movimentação conciliada.';
        this.loadAll();
      },
      error: err => {
        this.errorMsg = err?.error?.detail || 'Falha ao conciliar movimentação.';
      }
    });
  }

  cancelarConciliacao(): void {
    this.conciliacaoModal = null;
  }

  buscarPendentesConciliacao(): void {
    this.errorMsg = '';
    this.successMsg = '';
    if (!this.conciliacaoData || !this.conciliacaoForma) {
      this.errorMsg = 'Informe data e forma de pagamento para conciliar.';
      return;
    }
    this.carregandoConciliacao = true;
    this.movsApi.pendentesConciliacao({
      data_movimento: this.conciliacaoData,
      forma_pagamento: this.conciliacaoForma,
      conta_bancaria: this.selectedContaId
    }).subscribe({
      next: res => {
        this.conciliacaoPendentes = res;
        this.conciliacaoSelecionados = {};
        this.carregandoConciliacao = false;
      },
      error: err => {
        this.carregandoConciliacao = false;
        this.errorMsg = err?.error?.detail || 'Falha ao buscar recebíveis para conciliação.';
      }
    });
  }

  alternarMovConciliacao(mov: MovimentacaoFinanceira, checked: boolean): void {
    const id = mov.Idmovimentacao;
    if (!id) return;
    this.conciliacaoSelecionados[id] = checked;
  }

  movConciliacaoSelecionado(mov: MovimentacaoFinanceira): boolean {
    return !!mov.Idmovimentacao && !!this.conciliacaoSelecionados[mov.Idmovimentacao];
  }

  marcarTodosConciliacao(): void {
    const selecionados: Record<number, boolean> = {};
    this.conciliacaoPendentes.forEach(mov => {
      if (mov.Idmovimentacao) selecionados[mov.Idmovimentacao] = true;
    });
    this.conciliacaoSelecionados = selecionados;
  }

  limparSelecaoConciliacao(): void {
    this.conciliacaoSelecionados = {};
  }

  abrirConciliacaoLote(): void {
    const ids = this.idsConciliacaoSelecionados();
    if (!ids.length) {
      this.errorMsg = 'Selecione ao menos um recebível para conciliar.';
      return;
    }
    this.conciliacaoLoteModal = {
      data_conciliacao: this.today(),
      quantidade: ids.length,
      total: this.totalConciliacaoSelecionada()
    };
  }

  confirmarConciliacaoLote(): void {
    if (!this.conciliacaoLoteModal) return;
    const ids = this.idsConciliacaoSelecionados();
    if (!ids.length) {
      this.errorMsg = 'Selecione ao menos um recebível para conciliar.';
      return;
    }
    this.conciliandoLote = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.movsApi.conciliarLote({
      ids,
      data_conciliacao: this.conciliacaoLoteModal.data_conciliacao
    }).subscribe({
      next: res => {
        this.conciliandoLote = false;
        this.conciliacaoLoteModal = null;
        this.successMsg = `${res.quantidade} recebível(is) conciliado(s).`;
        this.buscarPendentesConciliacao();
        this.loadAll();
      },
      error: err => {
        this.conciliandoLote = false;
        this.errorMsg = err?.error?.detail || 'Falha ao conciliar recebíveis selecionados.';
      }
    });
  }

  cancelarConciliacaoLote(): void {
    this.conciliacaoLoteModal = null;
  }

  desfazerConciliacao(mov: MovimentacaoFinanceira): void {
    this.desfazerModal = mov;
  }

  confirmarDesfazerConciliacao(): void {
    const id = this.desfazerModal?.Idmovimentacao;
    if (!id) return;
    this.errorMsg = '';
    this.successMsg = '';
    this.movsApi.desfazerConciliacao(id).subscribe({
      next: () => {
        this.desfazerModal = null;
        this.successMsg = 'Conciliação desfeita.';
        this.loadAll();
      },
      error: err => {
        this.errorMsg = err?.error?.detail || 'Falha ao desfazer conciliação.';
      }
    });
  }

  cancelarDesfazerConciliacao(): void {
    this.desfazerModal = null;
  }

  podeDesfazerConciliacao(mov: MovimentacaoFinanceira): boolean {
    return mov.status === 'EFETIVA' && (!!mov.data_conciliacao || mov.origem === 'CARTAO');
  }

  totalConciliacaoSelecionada(): number {
    return this.conciliacaoPendentes
      .filter(mov => this.movConciliacaoSelecionado(mov))
      .reduce((acc, mov) => acc + Number(mov.valor || 0), 0);
  }

  quantidadeConciliacaoSelecionada(): number {
    return this.idsConciliacaoSelecionados().length;
  }

  contaSelecionada(): ContaBancaria | null {
    return this.contas.find(c => c.Idconta === this.selectedContaId) ?? null;
  }

  totalEntradas(): number {
    return this.movimentacoes
      .filter(m => m.tipo === 'ENTRADA' && m.status !== 'CANCELADA')
      .reduce((acc, m) => acc + Number(m.valor || 0), 0);
  }

  totalSaidas(): number {
    return this.movimentacoes
      .filter(m => m.tipo === 'SAIDA' && m.status !== 'CANCELADA')
      .reduce((acc, m) => acc + Number(m.valor || 0), 0);
  }

  saldoPeriodo(): number {
    return this.totalEntradas() - this.totalSaidas();
  }

  totalSaldoContas(): number {
    return this.contas.reduce((acc, conta) => acc + Number(conta.saldo_atual || 0), 0);
  }

  valorEntrada(item: MovimentacaoFinanceira): number | null {
    return item.tipo === 'ENTRADA' ? Number(item.valor || 0) : null;
  }

  valorSaida(item: MovimentacaoFinanceira): number | null {
    return item.tipo === 'SAIDA' ? Number(item.valor || 0) : null;
  }

  endpoints(tipo: DestinoTipo): Array<{ id: number; label: string }> {
    if (tipo === 'CAIXA') {
      return this.caixas
        .filter(c => c.ativo && !!c.Idcaixa)
        .map(c => ({ id: Number(c.Idcaixa), label: `${c.codigo} - ${c.descricao}` }));
    }
    return this.contasTodas
      .filter(c => c.ativo && !!c.Idconta)
      .map(c => ({ id: Number(c.Idconta), label: this.contaLabel(c) }));
  }

  contaLabel(conta: ContaBancaria): string {
    return `${conta.descricao} - ${conta.banco} Ag ${conta.agencia} Cc ${conta.conta}`;
  }

  lojaNome(id: number): string {
    return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`;
  }

  lojaFiltroLabel(): string {
    if (!this.lojasFiltro.length) return 'Todas as lojas';
    if (this.lojasFiltro.length === 1) {
      return this.lojas.find(loja => loja.id === this.lojasFiltro[0])?.nome_loja || '1 loja';
    }
    return `${this.lojasFiltro.length} lojas selecionadas`;
  }

  lojaFiltroSelecionada(id?: number | null): boolean {
    return !!id && this.lojasFiltro.includes(id);
  }

  selecionarTodasLojas(): void {
    this.lojasFiltro = [];
    this.filtrarContas();
  }

  alternarLojaFiltro(id: number | undefined, checked: boolean): void {
    if (!id) return;
    if (checked && !this.lojasFiltro.includes(id)) {
      this.lojasFiltro = [...this.lojasFiltro, id];
    } else if (!checked) {
      this.lojasFiltro = this.lojasFiltro.filter(lojaId => lojaId !== id);
    }
    this.filtrarContas();
  }

  filtrarContas(): void {
    this.contas = this.filter(this.contasTodas);
    if (!this.contas.some(c => c.Idconta === this.selectedContaId)) {
      this.selectedContaId = this.contas[0]?.Idconta ?? null;
      this.loadMovimentacoes();
    }
    this.sincronizarTransferencia();
    this.limparConciliacaoPendentes();
  }

  limparFiltros(): void {
    this.search = '';
    this.lojasFiltro = [];
    this.filtrarContas();
  }

  sincronizarTransferencia(): void {
    const raw = this.transferenciaForm.value;
    if (!raw.destino_id && this.selectedContaId && raw.destino_tipo === 'CONTA') {
      this.transferenciaForm.patchValue({ destino_id: this.selectedContaId });
    }
    if (raw.origem_tipo === raw.destino_tipo && raw.origem_id === raw.destino_id) {
      this.transferenciaForm.patchValue({ destino_id: null });
    }
  }

  private filter(items: ContaBancaria[]): ContaBancaria[] {
    const q = this.search.trim().toLowerCase();
    return items.filter(c => {
      const lojaOk = !this.lojasFiltro.length || this.lojasFiltro.includes(c.idloja);
      const buscaOk = !q ||
        c.descricao.toLowerCase().includes(q) ||
        c.banco.toLowerCase().includes(q) ||
        c.agencia.toLowerCase().includes(q) ||
        c.conta.toLowerCase().includes(q) ||
        this.lojaNome(c.idloja).toLowerCase().includes(q);
      return lojaOk && buscaOk;
    });
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  private idsConciliacaoSelecionados(): number[] {
    return Object.entries(this.conciliacaoSelecionados)
      .filter(([, selected]) => selected)
      .map(([id]) => Number(id))
      .filter(id => Number.isFinite(id));
  }

  private limparConciliacaoPendentes(): void {
    this.conciliacaoPendentes = [];
    this.conciliacaoSelecionados = {};
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
