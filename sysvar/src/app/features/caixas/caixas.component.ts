import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Caixa } from '../../core/models/caixa';
import { Loja } from '../../core/models/loja';
import { MovimentacaoFinanceira } from '../../core/models/movimentacao-financeira';
import { PlanoContabil } from '../../core/models/plano-contabil';
import { CaixasService } from '../../core/services/caixas.service';
import { LojasService } from '../../core/services/lojas.service';
import { MovimentacoesFinanceirasService } from '../../core/services/movimentacoes-financeiras.service';
import { PlanoContabilService } from '../../core/services/plano-contabil.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-caixas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './caixas.component.html',
  styleUrls: ['./caixas.component.css']
})
export class CaixasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CaixasService);
  private lojasApi = inject(LojasService);
  private movsApi = inject(MovimentacoesFinanceirasService);
  private planoApi = inject(PlanoContabilService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  showForm = false;
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
    { key: 'tipo', label: 'Tipo', visible: true, required: false },
    { key: 'loja', label: 'Loja', visible: true, required: false },
    { key: 'saldo', label: 'Saldo atual', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false }
  ];
  private readonly columnsStorageKey = 'sysvar.list.caixas.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.caixas';
  lojasFiltro: number[] = [];
  errorMsg = '';
  successMsg = '';

  caixas: Caixa[] = [];
  caixasTodas: Caixa[] = [];
  lojas: Loja[] = [];
  planoContabil: PlanoContabil[] = [];
  movimentacoes: MovimentacaoFinanceira[] = [];
  selectedCaixaId: number | null = null;
  resumoConsolidado = true;
  showExtratoConsolidado = false;
  dataIni = '';
  dataFim = '';
  transferindo = false;
  excluirModal: Caixa | null = null;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('financeiro', true) !== false;
  }

  get searchSuggestions(): string[] {
    const valores = [
      ...this.caixasTodas.flatMap(c => [
        c.codigo,
        c.descricao,
        c.tipo_caixa,
        c.idloja ? this.lojaNome(c.idloja) : ''
      ]),
      ...this.movimentacoes.flatMap(m => [
        m.documento,
        m.historico
      ])
    ].filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  get caixasPaginados(): Caixa[] {
    const start = (this.page - 1) * this.pageSize;
    return this.caixas.slice(start, start + this.pageSize);
  }

  get totalFiltrado(): number {
    return this.caixas.length;
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
      total: this.caixasTodas.length,
      ativos: this.caixasTodas.filter(c => c.ativo).length,
      loja: this.caixasTodas.filter(c => c.tipo_caixa !== 'MASTER').length,
      master: this.caixasTodas.filter(c => c.tipo_caixa === 'MASTER').length,
      saldo: this.caixasTodas.reduce((acc, c) => acc + Number(c.saldo_atual || 0), 0)
    };
  }

  form = this.fb.group({
    tipo_caixa: ['LOJA' as 'LOJA' | 'MASTER', Validators.required],
    idloja: [null as number | null],
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    conta_contabil: ['', Validators.maxLength(50)],
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
    this.loadViewPreference();
    this.loadColumnPreference();
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list(),
      caixas: this.api.list(),
      plano: this.planoApi.list({ ativa: true, analitica: true, page_size: 500 })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.caixasTodas = this.unwrap<Caixa>(res.caixas);
        this.planoContabil = this.unwrap<PlanoContabil>(res.plano)
          .filter(conta => conta.ativa !== false && conta.analitica !== false)
          .sort((a, b) => `${a.codigo || ''}`.localeCompare(`${b.codigo || ''}`));
        this.aplicarFiltros();
        if (!this.selectedCaixaId || !this.caixas.some(c => c.Idcaixa === this.selectedCaixaId)) {
          this.selectedCaixaId = this.caixas[0]?.Idcaixa ?? null;
        }
        this.resumoConsolidado = !this.lojasFiltro.length || this.lojasFiltro.length > 1;
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
    const caixasFiltrados = this.caixas
      .map(caixa => caixa.Idcaixa)
      .filter((id): id is number => !!id);

    if (this.resumoConsolidado) {
      if (!caixasFiltrados.length) {
        this.movimentacoes = [];
        return;
      }
      const ids = new Set(caixasFiltrados);
      this.movsApi.list({
        data_ini: this.dataIni,
        data_fim: this.dataFim,
        page_size: 5000
      }).subscribe({
        next: res => {
          this.movimentacoes = this.unwrap<MovimentacaoFinanceira>(res)
            .filter(mov => !!mov.caixa && ids.has(Number(mov.caixa)));
        },
        error: () => {
          this.errorMsg = 'Falha ao carregar movimentações dos caixas.';
        }
      });
      return;
    }

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
    this.clearMessages();
    this.selectedCaixaId = caixa.Idcaixa ?? null;
    this.resumoConsolidado = false;
    this.showExtratoConsolidado = false;
    this.sincronizarOrigemTransferencia();
    this.loadMovimentacoes();
  }

  isSelected(caixa: Caixa): boolean {
    return !!caixa.Idcaixa && caixa.Idcaixa === this.selectedCaixaId;
  }

  novo(): void {
    this.clearMessages();
    this.showForm = true;
    this.editingId = null;
    this.form.reset({
      idloja: this.lojas[0]?.id ?? null,
      tipo_caixa: 'LOJA',
      codigo: '',
      descricao: '',
      conta_contabil: '',
      saldo_inicial: 0,
      saldo_atual: 0,
      ativo: true,
      data_abertura: this.today()
    });
  }

  editar(item: Caixa): void {
    this.clearMessages();
    this.showForm = true;
    this.editingId = item.Idcaixa ?? null;
    this.form.reset({
      idloja: item.idloja,
      tipo_caixa: item.tipo_caixa ?? 'LOJA',
      codigo: item.codigo,
      descricao: item.descricao,
      conta_contabil: item.conta_contabil ?? '',
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
      conta_contabil: String(raw.conta_contabil || '').trim() || null,
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
    this.clearMessages();
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

  resumoCaixa(): { titulo: string; subtitulo: string; saldo: number } | null {
    if (this.resumoConsolidado) {
      return {
        titulo: this.lojasFiltro.length > 1 ? `${this.lojasFiltro.length} lojas selecionadas` : 'Todas as lojas',
        subtitulo: `${this.caixas.length} caixa(s) filtrado(s)`,
        saldo: this.totalSaldoCaixas()
      };
    }

    const caixa = this.caixaSelecionado();
    if (!caixa) return null;
    return {
      titulo: `${caixa.codigo} - ${caixa.descricao}`,
      subtitulo: this.lojaNome(caixa.idloja),
      saldo: Number(caixa.saldo_atual || 0)
    };
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

  contaContabilLabel(conta: PlanoContabil): string {
    return `${conta.codigo} - ${conta.descricao}`;
  }

  aplicarFiltros(): void {
    this.caixas = this.filter(this.caixasTodas);
    this.page = 1;
  }

  filtrarCaixas(): void {
    this.clearMessages();
    this.aplicarFiltros();
    if (!this.caixas.some(c => c.Idcaixa === this.selectedCaixaId)) {
      this.selectedCaixaId = this.caixas[0]?.Idcaixa ?? null;
    }
    this.resumoConsolidado = !this.lojasFiltro.length || this.lojasFiltro.length > 1;
    if (!this.resumoConsolidado) this.showExtratoConsolidado = false;
    this.sincronizarOrigemTransferencia();
    this.loadMovimentacoes();
  }

  limparFiltros(): void {
    this.clearMessages();
    this.search = '';
    this.lojasFiltro = [];
    this.filterTipo = '';
    this.filterStatus = '';
    this.filtrarCaixas();
  }

  editarSelecionado(): void {
    const caixa = this.caixaSelecionado();
    if (caixa) this.editar(caixa);
  }

  excluirSelecionado(): void {
    const caixa = this.caixaSelecionado();
    if (caixa) this.excluir(caixa);
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

  @HostListener('window:sysvar-caixas-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-caixas-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-caixas-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

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

  selecionarTodasLojas(event?: Event): void {
    this.lojasFiltro = [];
    this.filtrarCaixas();
    this.fecharSeletorLojas(event);
  }

  alternarLojaFiltro(id: number | undefined, checked: boolean, event?: Event): void {
    if (!id) return;
    if (checked && !this.lojasFiltro.includes(id)) {
      this.lojasFiltro = [...this.lojasFiltro, id];
    } else if (!checked) {
      this.lojasFiltro = this.lojasFiltro.filter(lojaId => lojaId !== id);
    }
    this.filtrarCaixas();
    this.fecharSeletorLojas(event);
  }

  fecharSeletorLojas(event?: Event): void {
    const target = event?.target as HTMLElement | null;
    target?.closest('details')?.removeAttribute('open');
  }

  abrirExtratoConsolidado(): void {
    this.clearMessages();
    this.showExtratoConsolidado = true;
    this.loadMovimentacoes();
  }

  fecharExtratoConsolidado(): void {
    this.showExtratoConsolidado = false;
  }

  clearMessages(): void {
    this.errorMsg = '';
    this.successMsg = '';
  }

  private filter(items: Caixa[]): Caixa[] {
    const q = this.search.trim().toLowerCase();
    return items.filter(c => {
      const lojaOk = !this.lojasFiltro.length || (!!c.idloja && this.lojasFiltro.includes(c.idloja));
      const tipoOk = !this.filterTipo || c.tipo_caixa === this.filterTipo;
      const statusOk = !this.filterStatus || (this.filterStatus === 'ATIVO' ? c.ativo : !c.ativo);
      const buscaOk = !q ||
        c.codigo.toLowerCase().includes(q) ||
        c.descricao.toLowerCase().includes(q) ||
        this.lojaNome(c.idloja).toLowerCase().includes(q);
      return lojaOk && tipoOk && statusOk && buscaOk;
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
