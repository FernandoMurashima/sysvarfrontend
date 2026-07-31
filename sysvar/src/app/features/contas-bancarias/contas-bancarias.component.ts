import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Caixa } from '../../core/models/caixa';
import { ContaBancaria } from '../../core/models/conta-bancaria';
import { FormaPagamento } from '../../core/models/forma-pagamento';
import { Loja } from '../../core/models/loja';
import { MovimentacaoFinanceira } from '../../core/models/movimentacao-financeira';
import { PlanoContabil } from '../../core/models/plano-contabil';
import { CaixasService } from '../../core/services/caixas.service';
import { ContasBancariasService } from '../../core/services/contas-bancarias.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { LojasService } from '../../core/services/lojas.service';
import { MovimentacoesFinanceirasService } from '../../core/services/movimentacoes-financeiras.service';
import { PlanoContabilService } from '../../core/services/plano-contabil.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

type DestinoTipo = 'CAIXA' | 'CONTA';
type PainelOperacional = 'contas' | 'extrato' | 'conciliacao' | 'transferencia';

@Component({
  selector: 'app-contas-bancarias',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, SearchSuggestComponent],
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
  private planoApi = inject(PlanoContabilService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  transferindo = false;
  showForm = false;
  painelAberto: PainelOperacional | null = null;
  editingId: number | null = null;
  search = '';
  filterTipo = '';
  filterStatus = '';
  indicatorsVisible = true;
  filtersVisible = true;
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  columnsOpen = false;
  exportOpen = false;
  columns = [
    { key: 'banco', label: 'Banco', visible: true, required: false },
    { key: 'agencia', label: 'Agência', visible: true, required: false },
    { key: 'conta', label: 'Conta', visible: true, required: false },
    { key: 'loja', label: 'Loja', visible: true, required: false },
    { key: 'saldo', label: 'Saldo atual', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false }
  ];
  private readonly columnsStorageKey = 'sysvar.list.contas-bancarias.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.contas-bancarias';
  lojasFiltro: number[] = [];
  errorMsg = '';
  successMsg = '';

  contas: ContaBancaria[] = [];
  contasTodas: ContaBancaria[] = [];
  caixas: Caixa[] = [];
  formasPagamento: FormaPagamento[] = [];
  planoContabil: PlanoContabil[] = [];
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

  get searchSuggestions(): string[] {
    const valores = [
      ...this.contasTodas.flatMap(c => [
        c.descricao,
        c.banco,
        c.agencia,
        c.conta,
        c.pix_chave,
        c.idloja ? this.lojaNome(c.idloja) : ''
      ]),
      ...this.movimentacoes.flatMap(m => [
        m.documento,
        m.historico
      ])
    ].filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  get contasPaginadas(): ContaBancaria[] {
    const start = (this.page - 1) * this.pageSize;
    return this.contas.slice(start, start + this.pageSize);
  }

  get totalFiltrado(): number {
    return this.contas.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalFiltrado / this.pageSize));
  }

  get pageStart(): number {
    return this.totalFiltrado ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalFiltrado);
  }

  get indicadores() {
    return {
      total: this.contasTodas.length,
      ativas: this.contasTodas.filter(c => c.ativo).length,
      correntes: this.contasTodas.filter(c => c.tipo_conta === 'CORRENTE').length,
      pagamento: this.contasTodas.filter(c => c.tipo_conta === 'PAGAMENTO').length,
      saldo: this.contasTodas.reduce((acc, c) => acc + Number(c.saldo_atual || 0), 0)
    };
  }

  form = this.fb.group({
    idloja: [null as number | null, Validators.required],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    banco: ['', [Validators.required, Validators.maxLength(80)]],
    agencia: ['', [Validators.required, Validators.maxLength(20)]],
    conta: ['', [Validators.required, Validators.maxLength(30)]],
    tipo_conta: ['CORRENTE', Validators.required],
    pix_chave: [''],
    conta_contabil: ['', Validators.maxLength(50)],
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
    this.loadViewPreference();
    this.loadColumnPreference();
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list(),
      caixas: this.caixasApi.list({ ativo: true }),
      contas: this.api.list(),
      formas: this.formasApi.list({ ativo: true }),
      plano: this.planoApi.list({ ativa: true, analitica: true, page_size: 500 })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.caixas = this.unwrap<Caixa>(res.caixas);
        this.contasTodas = this.unwrap<ContaBancaria>(res.contas);
        this.formasPagamento = this.unwrap<FormaPagamento>(res.formas);
        this.planoContabil = this.unwrap<PlanoContabil>(res.plano)
          .filter(conta => conta.ativa !== false && conta.analitica !== false)
          .sort((a, b) => `${a.codigo || ''}`.localeCompare(`${b.codigo || ''}`));
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

  isSelected(conta: ContaBancaria): boolean {
    return !!conta.Idconta && conta.Idconta === this.selectedContaId;
  }

  novo(): void {
    this.painelAberto = null;
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
      conta_contabil: '',
      saldo_inicial: 0,
      saldo_atual: 0,
      ativo: true
    });
  }

  editar(item: ContaBancaria): void {
    this.painelAberto = null;
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
      conta_contabil: item.conta_contabil ?? '',
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
      conta_contabil: String(raw.conta_contabil || '').trim() || null,
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

  abrirPainel(painel: PainelOperacional): void {
    this.painelAberto = painel;
    if (painel === 'extrato') {
      this.loadMovimentacoes();
    }
    if (painel === 'conciliacao') {
      this.buscarPendentesConciliacao();
    }
  }

  fecharPainel(): void {
    this.painelAberto = null;
  }

  tituloPainel(): string {
    const titulos: Record<PainelOperacional, string> = {
      contas: 'Contas bancárias',
      extrato: 'Extrato bancário',
      conciliacao: 'Conciliação bancária',
      transferencia: 'Transferência'
    };
    return this.painelAberto ? titulos[this.painelAberto] : '';
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
    if (!this.selectedContaId) {
      this.errorMsg = 'Selecione uma conta bancária para conciliar.';
      return;
    }
    this.carregandoConciliacao = true;
    this.movsApi.pendentesConciliacao({
      forma_pagamento: this.conciliacaoForma || null,
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

  contaContabilLabel(conta: PlanoContabil): string {
    return `${conta.codigo} - ${conta.descricao}`;
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
    this.page = 1;
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
    this.filterTipo = '';
    this.filterStatus = '';
    this.filtrarContas();
  }

  editarSelecionado(): void {
    const conta = this.contaSelecionada();
    if (conta) this.editar(conta);
  }

  excluirSelecionado(): void {
    const conta = this.contaSelecionada();
    if (conta) this.excluir(conta);
  }

  visibleColumn(key: string): boolean {
    return this.columns.find(c => c.key === key)?.visible !== false;
  }

  toggleColumn(key: string, visible: boolean): void {
    const col = this.columns.find(c => c.key === key);
    if (!col || col.required) return;
    col.visible = visible;
    this.saveColumnPreference();
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value) || 20;
    this.page = 1;
  }

  firstPage(): void { this.page = 1; }
  prevPage(): void { this.page = Math.max(1, this.page - 1); }
  nextPage(): void { this.page = Math.min(this.totalPages, this.page + 1); }
  lastPage(): void { this.page = this.totalPages; }

  @HostListener('window:sysvar-contas-bancarias-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-contas-bancarias-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-contas-bancarias-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

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
      const tipoOk = !this.filterTipo || c.tipo_conta === this.filterTipo;
      const statusOk = !this.filterStatus || (this.filterStatus === 'ATIVO' ? c.ativo : !c.ativo);
      const buscaOk = !q ||
        c.descricao.toLowerCase().includes(q) ||
        c.banco.toLowerCase().includes(q) ||
        c.agencia.toLowerCase().includes(q) ||
        c.conta.toLowerCase().includes(q) ||
        this.lojaNome(c.idloja).toLowerCase().includes(q);
      return lojaOk && tipoOk && statusOk && buscaOk;
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

  private toggleIndicators(): void {
    this.indicatorsVisible = !this.indicatorsVisible;
    this.saveViewPreference();
  }

  private toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
    this.saveViewPreference();
  }

  private restoreViewPreference(): void {
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.columns.forEach(col => col.visible = true);
    localStorage.removeItem(this.viewPrefsKey);
    localStorage.removeItem(this.columnsStorageKey);
  }

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try {
      const prefs = JSON.parse(raw);
      this.indicatorsVisible = prefs.indicatorsVisible !== false;
      this.filtersVisible = prefs.filtersVisible !== false;
    } catch {}
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible }));
  }

  private loadColumnPreference(): void {
    const raw = localStorage.getItem(this.columnsStorageKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as Record<string, boolean>;
      this.columns.forEach(col => {
        if (!col.required && state[col.key] !== undefined) col.visible = state[col.key];
      });
    } catch {}
  }

  private saveColumnPreference(): void {
    const state = Object.fromEntries(this.columns.map(col => [col.key, col.visible]));
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(state));
  }
}
