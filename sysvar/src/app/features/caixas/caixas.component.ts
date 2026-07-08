import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Caixa } from '../../core/models/caixa';
import { Loja } from '../../core/models/loja';
import { MovimentacaoFinanceira } from '../../core/models/movimentacao-financeira';
import { CaixasService } from '../../core/services/caixas.service';
import { LojasService } from '../../core/services/lojas.service';
import { MovimentacoesFinanceirasService } from '../../core/services/movimentacoes-financeiras.service';

@Component({
  selector: 'app-caixas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './caixas.component.html',
  styleUrls: ['./caixas.component.css']
})
export class CaixasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CaixasService);
  private lojasApi = inject(LojasService);
  private movsApi = inject(MovimentacoesFinanceirasService);

  loading = false;
  saving = false;
  showForm = false;
  editingId: number | null = null;
  search = '';
  lojasFiltro: number[] = [];
  errorMsg = '';
  successMsg = '';

  caixas: Caixa[] = [];
  caixasTodas: Caixa[] = [];
  lojas: Loja[] = [];
  movimentacoes: MovimentacaoFinanceira[] = [];
  selectedCaixaId: number | null = null;
  dataIni = '';
  dataFim = '';
  transferindo = false;
  excluirModal: Caixa | null = null;

  form = this.fb.group({
    tipo_caixa: ['LOJA' as 'LOJA' | 'MASTER', Validators.required],
    idloja: [null as number | null],
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    saldo_inicial: [0, Validators.required],
    saldo_atual: [0, Validators.required],
    ativo: [true],
    data_abertura: [this.today(), Validators.required]
  });

  transferenciaForm = this.fb.group({
    caixa_origem: [null as number | null, Validators.required],
    caixa_destino: [null as number | null, Validators.required],
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
    forkJoin({ lojas: this.lojasApi.list(), caixas: this.api.list() }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.caixasTodas = this.unwrap<Caixa>(res.caixas);
        this.aplicarFiltros();
        if (!this.selectedCaixaId || !this.caixas.some(c => c.Idcaixa === this.selectedCaixaId)) {
          this.selectedCaixaId = this.caixas[0]?.Idcaixa ?? null;
        }
        this.sincronizarOrigemTransferencia();
        this.loading = false;
        this.loadMovimentacoes();
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar caixas.';
      }
    });
  }

  loadMovimentacoes(): void {
    if (!this.selectedCaixaId) {
      this.movimentacoes = [];
      return;
    }
    this.movsApi.list({
      caixa: this.selectedCaixaId,
      data_ini: this.dataIni,
      data_fim: this.dataFim,
      page_size: 5000
    }).subscribe({
      next: res => {
        this.movimentacoes = this.unwrap<MovimentacaoFinanceira>(res);
      },
      error: () => {
        this.errorMsg = 'Falha ao carregar movimentações do caixa.';
      }
    });
  }

  selecionarCaixa(caixa: Caixa): void {
    this.selectedCaixaId = caixa.Idcaixa ?? null;
    this.sincronizarOrigemTransferencia();
    this.loadMovimentacoes();
  }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.form.reset({
      idloja: this.lojas[0]?.id ?? null,
      tipo_caixa: 'LOJA',
      codigo: '',
      descricao: '',
      saldo_inicial: 0,
      saldo_atual: 0,
      ativo: true,
      data_abertura: this.today()
    });
  }

  editar(item: Caixa): void {
    this.showForm = true;
    this.editingId = item.Idcaixa ?? null;
    this.form.reset({
      idloja: item.idloja,
      tipo_caixa: item.tipo_caixa ?? 'LOJA',
      codigo: item.codigo,
      descricao: item.descricao,
      saldo_inicial: Number(item.saldo_inicial),
      saldo_atual: Number(item.saldo_atual),
      ativo: item.ativo,
      data_abertura: item.data_abertura
    });
  }

  salvar(): void {
    if (this.form.invalid || (this.form.value.tipo_caixa !== 'MASTER' && !this.form.value.idloja)) {
      this.errorMsg = 'Revise os campos obrigatórios.';
      return;
    }
    const raw = this.form.value;
    const payload: Partial<Caixa> = {
      tipo_caixa: raw.tipo_caixa ?? 'LOJA',
      idloja: raw.tipo_caixa === 'MASTER' ? null : Number(raw.idloja),
      codigo: String(raw.codigo || '').trim(),
      descricao: String(raw.descricao || '').trim(),
      saldo_inicial: Number(raw.saldo_inicial || 0),
      saldo_atual: Number(raw.saldo_atual || 0),
      ativo: !!raw.ativo,
      data_abertura: String(raw.data_abertura)
    };
    this.saving = true;
    const req = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Caixa salvo.';
        this.cancelar();
        this.loadAll();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao salvar caixa.';
      }
    });
  }

  excluir(item: Caixa): void {
    if (!item.Idcaixa) return;
    this.excluirModal = item;
  }

  confirmarExclusao(): void {
    const id = this.excluirModal?.Idcaixa;
    if (!id) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Caixa excluído.';
        this.excluirModal = null;
        this.loadAll();
      },
      error: () => this.errorMsg = 'Falha ao excluir caixa.'
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
    if (raw.caixa_origem === raw.caixa_destino) {
      this.errorMsg = 'Caixa de origem e destino devem ser diferentes.';
      return;
    }

    this.transferindo = true;
    this.api.transferir({
      caixa_origem: Number(raw.caixa_origem),
      caixa_destino: Number(raw.caixa_destino),
      documento: String(raw.documento || '').trim() || null,
      valor: Number(raw.valor || 0),
      data_movimento: String(raw.data_movimento || this.today()),
      observacao: String(raw.observacao || '').trim() || null
    }).subscribe({
      next: (res) => {
        this.transferindo = false;
        this.successMsg = `Transferência registrada: ${res?.documento || ''}`.trim();
        this.transferenciaForm.patchValue({ documento: '', valor: 0, observacao: '' });
        this.loadAll();
      },
      error: (err) => {
        this.transferindo = false;
        this.errorMsg = err?.error?.detail || 'Falha ao registrar transferência.';
      }
    });
  }

  lojaNome(id?: number | null): string {
    if (!id) return 'Grupo';
    return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`;
  }

  caixaSelecionado(): Caixa | null {
    return this.caixas.find(c => c.Idcaixa === this.selectedCaixaId) ?? null;
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

  totalSaldoCaixas(): number {
    return this.caixas.reduce((acc, caixa) => acc + Number(caixa.saldo_atual || 0), 0);
  }

  totalSaldoCaixasLoja(): number {
    return this.caixas
      .filter(caixa => caixa.tipo_caixa !== 'MASTER')
      .reduce((acc, caixa) => acc + Number(caixa.saldo_atual || 0), 0);
  }

  totalSaldoCaixasMaster(): number {
    return this.caixas
      .filter(caixa => caixa.tipo_caixa === 'MASTER')
      .reduce((acc, caixa) => acc + Number(caixa.saldo_atual || 0), 0);
  }

  valorEntrada(item: MovimentacaoFinanceira): number | null {
    return item.tipo === 'ENTRADA' ? Number(item.valor || 0) : null;
  }

  valorSaida(item: MovimentacaoFinanceira): number | null {
    return item.tipo === 'SAIDA' ? Number(item.valor || 0) : null;
  }

  caixasAtivos(): Caixa[] {
    return this.caixas.filter(c => c.ativo && !!c.Idcaixa);
  }

  caixasDestino(): Caixa[] {
    const origem = this.transferenciaForm.value.caixa_origem;
    return this.caixasAtivos().filter(c => c.Idcaixa !== origem);
  }

  caixaLabel(caixa: Caixa): string {
    return `${caixa.codigo} - ${caixa.descricao}`;
  }

  aplicarFiltros(): void {
    this.caixas = this.filter(this.caixasTodas);
  }

  filtrarCaixas(): void {
    this.aplicarFiltros();
    if (!this.caixas.some(c => c.Idcaixa === this.selectedCaixaId)) {
      this.selectedCaixaId = this.caixas[0]?.Idcaixa ?? null;
      this.loadMovimentacoes();
    }
    this.sincronizarOrigemTransferencia();
  }

  limparFiltros(): void {
    this.search = '';
    this.lojasFiltro = [];
    this.filtrarCaixas();
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
    this.filtrarCaixas();
  }

  alternarLojaFiltro(id: number | undefined, checked: boolean): void {
    if (!id) return;
    if (checked && !this.lojasFiltro.includes(id)) {
      this.lojasFiltro = [...this.lojasFiltro, id];
    } else if (!checked) {
      this.lojasFiltro = this.lojasFiltro.filter(lojaId => lojaId !== id);
    }
    this.filtrarCaixas();
  }

  private filter(items: Caixa[]): Caixa[] {
    const q = this.search.trim().toLowerCase();
    return items.filter(c => {
      const lojaOk = !this.lojasFiltro.length || (!!c.idloja && this.lojasFiltro.includes(c.idloja));
      const buscaOk = !q ||
        c.codigo.toLowerCase().includes(q) ||
        c.descricao.toLowerCase().includes(q) ||
        this.lojaNome(c.idloja).toLowerCase().includes(q);
      return lojaOk && buscaOk;
    });
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  sincronizarOrigemTransferencia(): void {
    if (!this.transferenciaForm.value.caixa_origem && this.selectedCaixaId) {
      this.transferenciaForm.patchValue({ caixa_origem: this.selectedCaixaId });
    }
    const destino = this.transferenciaForm.value.caixa_destino;
    if (destino && destino === this.transferenciaForm.value.caixa_origem) {
      this.transferenciaForm.patchValue({ caixa_destino: null });
    }
  }
}
