import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InventarioEstoque, InventarioEstoqueItem } from '../../core/models/estoque';
import { Loja } from '../../core/models/loja';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';
import { AuthService } from '../../core/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-estoque-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, RowActionsMenuComponent, SearchSuggestComponent],
  templateUrl: './estoque-inventario.component.html',
  styleUrls: ['./estoque-inventario.component.css']
})
export class EstoqueInventarioComponent implements OnInit {
  @ViewChild('scannerInput') scannerInput?: ElementRef<HTMLInputElement>;
  private fb = inject(FormBuilder);
  private api = inject(EstoqueService);
  private lojasApi = inject(LojasService);
  private auth = inject(AuthService);
  loading = false; saving = false; showForm = false; errorMsg = ''; successMsg = '';
  lojas: Loja[] = []; inventarios: InventarioEstoque[] = []; selecionado: InventarioEstoque | null = null;
  fecharModal: InventarioEstoque | null = null;
  search = '';
  filterLoja = '';
  filterStatus = '';
  itemSearch = '';
  itemSituacao: 'todos' | 'pendentes' | 'contados' | 'divergentes' = 'todos';
  scannerEan = '';
  scannerMode: 'incremental' | 'quantidade' = 'incremental';
  scannerQuantidade: number | null = null;
  scannerItem: InventarioEstoqueItem | null = null;
  importFile: File | null = null;
  importPreview: any = null;
  importing = false;
  advancedOpen = false;
  columnsOpen = false;
  exportOpen = false;
  indicatorsVisible = true;
  filtersVisible = true;
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  private readonly columnsStorageKey = 'sysvar.list.estoque-inventario.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.estoque-inventario';
  columns = [
    { key: 'descricao', label: 'Descrição', visible: true, required: true },
    { key: 'loja', label: 'Loja', visible: true, required: false },
    { key: 'data', label: 'Data', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
    { key: 'itens', label: 'Itens', visible: true, required: false },
    { key: 'contados', label: 'Contados', visible: true, required: false },
    { key: 'divergencias', label: 'Diverg.', visible: true, required: false },
  ];
  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('estoque', true) !== false; }
  form = this.fb.group({ Idloja: [null as number | null, Validators.required], descricao: ['', Validators.required], data_abertura: [this.today(), Validators.required], observacao: [''] });
  ngOnInit(): void { this.loadColumnsPreference(); this.loadViewPreference(); this.load(); }
  load(): void {
    this.loading = true;
    forkJoin({ lojas: this.lojasApi.list(), invs: this.api.listInventarios() }).subscribe({
      next: r => {
        this.lojas = this.unwrap<Loja>(r.lojas);
        this.inventarios = this.unwrap<InventarioEstoque>(r.invs);
        if (this.selecionado?.Idinventario) {
          this.selecionado = this.inventarios.find(inv => inv.Idinventario === this.selecionado?.Idinventario) || null;
        }
        this.page = 1;
        this.loading = false;
      },
      error: () => { this.loading = false; this.errorMsg = 'Falha ao carregar inventários.'; }
    });
  }
  novo(): void { if (!this.podeEditarModulo) return; this.showForm = true; this.form.reset({ Idloja: this.lojas[0]?.id ?? null, descricao: '', data_abertura: this.today(), observacao: '' }); }
  salvar(): void {
    if (!this.podeEditarModulo) return;
    if (this.form.invalid) return;
    const raw = this.form.value; this.saving = true;
    this.api.createInventario({ Idloja: Number(raw.Idloja), descricao: String(raw.descricao), data_abertura: String(raw.data_abertura), observacao: String(raw.observacao || '') || null, status: 'ABERTO' }).subscribe({
      next: inv => { this.saving = false; this.showForm = false; this.successMsg = 'Inventário criado.'; this.selecionado = inv; this.load(); },
      error: () => { this.saving = false; this.errorMsg = 'Falha ao criar inventário.'; }
    });
  }
  gerarItens(inv: InventarioEstoque): void { if (!this.podeEditarModulo) return; if (!inv.Idinventario) return; this.api.gerarItensInventario(inv.Idinventario).subscribe({ next: res => { this.successMsg = `${res.created || 0} item(ns) gerado(s).`; this.load(); }, error: err => this.errorMsg = this.errorText(err, 'Falha ao gerar itens.') }); }
  validar(inv: InventarioEstoque): void {
    if (!this.podeEditarModulo || !inv.Idinventario) return;
    this.api.validarInventario(inv.Idinventario).subscribe({
      next: res => { this.successMsg = `Inventário validado. Divergências: ${res?.divergencias || 0}.`; this.load(); },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao validar inventário.'),
    });
  }
  fechar(inv: InventarioEstoque): void { if (!this.podeEditarModulo) return; if (!inv.Idinventario) return; this.fecharModal = inv; }
  confirmarFechamento(): void {
    if (!this.podeEditarModulo) return;
    const inv = this.fecharModal;
    if (!inv?.Idinventario) return;
    if (this.indicadoresInventario(inv).pendentes > 0) {
      this.errorMsg = `Resolva ${this.indicadoresInventario(inv).pendentes} pendência(s) antes de finalizar.`;
      return;
    }
    this.api.finalizarInventario(inv.Idinventario).subscribe({
      next: res => { this.fecharModal = null; this.successMsg = `Inventário finalizado. ${res.movimentos_gerados || 0} ajuste(s) gerado(s).`; this.load(); },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao finalizar inventário.')
    });
  }
  cancelarFechamento(): void { this.fecharModal = null; }
  lerScanner(): void {
    const inv = this.selecionado;
    const ean = this.scannerEan.replace(/\D/g, '');
    if (!inv?.Idinventario || !this.podeContar(inv)) {
      this.errorMsg = 'Inventário fechado não aceita leitura.';
      this.limparScanner(true);
      return;
    }
    if (ean.length !== 13) {
      this.errorMsg = 'Informe um EAN-13 válido.';
      this.limparScanner(true);
      return;
    }
    if (this.scannerMode === 'incremental') {
      this.api.lerEanInventario(inv.Idinventario, { ean, modo: 'incremental' }).subscribe({
        next: item => {
          this.aplicarItemAtualizado(item);
          this.itemSearch = ean;
          this.itemSituacao = 'todos';
          this.successMsg = `Leitura registrada: ${ean}.`;
          this.limparScanner(true);
        },
        error: err => {
          this.errorMsg = this.errorText(err, 'Falha ao ler EAN.');
          this.limparScanner(true);
        },
      });
      return;
    }
    const existente = (inv.itens || []).find(item => item.CodigodeBarra === ean);
    if (existente) {
      this.prepararQuantidadeScanner(existente, ean);
      return;
    }
    this.api.createInventarioItem({ inventario: inv.Idinventario, CodigodeBarra: ean }).subscribe({
      next: item => {
        this.aplicarItemAtualizado(item);
        this.prepararQuantidadeScanner(item, ean);
      },
      error: err => {
        this.errorMsg = this.errorText(err, 'Falha ao localizar EAN.');
        this.limparScanner(true);
      },
    });
  }
  salvarQuantidadeScanner(): void {
    const inv = this.selecionado;
    const item = this.scannerItem;
    const quantidade = Number(this.scannerQuantidade);
    if (!inv?.Idinventario || !this.podeContar(inv)) {
      this.errorMsg = 'Inventário fechado não aceita leitura.';
      this.limparScanner(true);
      return;
    }
    if (!item?.Idinventarioitem || !Number.isFinite(quantidade) || quantidade < 0) {
      this.errorMsg = 'Informe uma quantidade válida.';
      return;
    }
    this.api.lerEanInventario(inv.Idinventario, { ean: item.CodigodeBarra, modo: 'quantidade', quantidade }).subscribe({
      next: atualizado => {
        this.aplicarItemAtualizado(atualizado);
        this.successMsg = `Quantidade registrada: ${item.CodigodeBarra}.`;
        this.scannerItem = null;
        this.scannerQuantidade = null;
        this.limparScanner(true);
      },
      error: err => {
        this.errorMsg = this.errorText(err, 'Falha ao salvar quantidade.');
        this.focarScanner();
      },
    });
  }
  onImportFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importFile = input.files?.[0] || null;
    this.importPreview = null;
  }
  validarImportacao(): void {
    const inv = this.selecionado;
    if (!inv?.Idinventario || !this.podeContar(inv) || !this.importFile) return;
    this.importing = true;
    this.api.previewImportacaoInventario(inv.Idinventario, this.importFile).subscribe({
      next: preview => {
        this.importPreview = preview;
        this.importing = false;
        this.successMsg = 'Arquivo validado.';
      },
      error: err => {
        this.importing = false;
        this.errorMsg = this.errorText(err, 'Falha ao validar arquivo.');
      },
    });
  }
  confirmarImportacao(): void {
    const inv = this.selecionado;
    const validas = this.importPreview?.validas || [];
    if (!inv?.Idinventario || !this.podeContar(inv) || !validas.length) return;
    this.importing = true;
    this.api.aplicarImportacaoInventario(inv.Idinventario, validas).subscribe({
      next: res => {
        this.importing = false;
        this.importPreview = null;
        this.importFile = null;
        this.successMsg = `Importação aplicada: ${res?.linhas_validas || 0} SKU(s).`;
        this.load();
      },
      error: err => {
        this.importing = false;
        this.errorMsg = this.errorText(err, 'Falha ao aplicar importação.');
      },
    });
  }
  atualizarItem(item: InventarioEstoqueItem): void {
    if (!this.podeEditarModulo) return;
    if (!item.Idinventarioitem) return;
    const quantidade = Number(item.saldo_contado);
    if (!Number.isFinite(quantidade) || quantidade < 0) {
      this.errorMsg = 'Informe uma quantidade válida.';
      return;
    }
    this.api.updateInventarioItem(item.Idinventarioitem, { saldo_contado: quantidade, observacao: item.observacao }).subscribe({
      next: atualizado => {
        Object.assign(item, atualizado);
        this.atualizarTotaisSelecionado();
        this.successMsg = 'Contagem atualizada.';
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao atualizar item.')
    });
  }
  rowActions(inv: InventarioEstoque): RowAction[] {
    return [
      { key: 'ver', label: 'Consultar', icon: '⌕' },
      { key: 'gerar', label: 'Gerar itens', icon: '☷', visible: this.podeEditarModulo && inv.status === 'ABERTO' },
      { key: 'validar', label: 'Validar', icon: '✓', visible: this.podeEditarModulo && inv.status === 'ABERTO' },
      { key: 'finalizar', label: 'Finalizar', icon: '⏹', danger: true, visible: this.podeEditarModulo && inv.status === 'VALIDADO' && this.indicadoresInventario(inv).pendentes === 0 },
    ];
  }
  executarAcao(action: string, inv: InventarioEstoque): void {
    if (action === 'ver') this.selecionado = inv;
    if (action === 'gerar') this.gerarItens(inv);
    if (action === 'validar') this.validar(inv);
    if (action === 'finalizar') this.fechar(inv);
  }
  doSearch(): void { this.page = 1; }
  clearSearch(): void { this.search = ''; this.filterLoja = ''; this.filterStatus = ''; this.page = 1; }
  doFilter(): void { this.page = 1; }
  onPageSizeChange(size: string): void { this.pageSize = Number(size) || 20; localStorage.setItem('sysvar.list.estoque-inventario.pageSize', String(this.pageSize)); this.page = 1; }
  firstPage(): void { this.page = 1; }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }
  lastPage(): void { this.page = this.totalPages; }
  selecionarInventario(inv: InventarioEstoque): void {
    this.selecionado = this.selecionado?.Idinventario === inv.Idinventario ? null : inv;
    this.itemSearch = '';
    this.itemSituacao = 'todos';
    this.importFile = null;
    this.importPreview = null;
    this.limparScanner(false);
  }
  isSelected(inv: InventarioEstoque): boolean { return this.selecionado?.Idinventario === inv.Idinventario; }
  consultarSelecionado(): void { if (this.selecionado) this.selecionado = this.selecionado; }
  gerarSelecionado(): void { if (this.selecionado) this.gerarItens(this.selecionado); }
  validarSelecionado(): void { if (this.selecionado) this.validar(this.selecionado); }
  finalizarSelecionado(): void { if (this.selecionado) this.fechar(this.selecionado); }
  visibleColumn(key: string): boolean { return this.columns.find(c => c.key === key)?.visible !== false; }
  toggleColumn(key: string, checked: boolean): void {
    const col = this.columns.find(c => c.key === key);
    if (!col || col.required) return;
    col.visible = checked;
    this.saveColumnsPreference();
  }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  restoreViewPreference(): void {
    localStorage.removeItem(this.viewPrefsKey);
    localStorage.removeItem('sysvar.list.estoque-inventario.pageSize');
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.pageSize = 20;
    this.columns = this.columns.map(c => ({ ...c, visible: true }));
    this.saveColumnsPreference();
    this.page = 1;
  }
  @HostListener('window:sysvar-estoque-inventario-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-estoque-inventario-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-estoque-inventario-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }
  lojaNome(id: number): string { return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`; }
  statusLabel(status: string): string {
    return ({ ABERTO: 'Aberto', VALIDADO: 'Validado', FECHADO: 'Finalizado', CANCELADO: 'Cancelado' } as Record<string, string>)[status] || status;
  }
  podeContar(inv?: InventarioEstoque | null): boolean { return !!inv && inv.status === 'ABERTO' && this.podeEditarModulo; }
  pendentes(inv: InventarioEstoque): number { return Number(inv.total_itens || inv.itens?.length || 0) - Number(inv.total_contados || 0); }
  situacaoItem(item: InventarioEstoqueItem): 'Pendente' | 'Divergente' | 'Contado' {
    if (!item.contado) return 'Pendente';
    return Number(item.diferenca || 0) !== 0 ? 'Divergente' : 'Contado';
  }
  classeSituacaoItem(item: InventarioEstoqueItem): 'pending' | 'shortage' | 'surplus' | 'ok' {
    if (!item.contado) return 'pending';
    const diff = Number(item.diferenca || 0);
    if (diff > 0) return 'surplus';
    if (diff < 0) return 'shortage';
    return 'ok';
  }
  indicadoresInventario(inv: InventarioEstoque | null): { total: number; contados: number; pendentes: number; semDivergencia: number; sobra: number; falta: number; divergencias: number } {
    const itens = inv?.itens || [];
    const total = Number(inv?.total_itens ?? itens.length);
    const contados = Number(inv?.total_contados ?? itens.filter(item => item.contado).length);
    const pendentes = Number(inv?.total_pendentes ?? itens.filter(item => !item.contado).length);
    const semDivergencia = Number(inv?.total_sem_divergencia ?? itens.filter(item => item.contado && Number(item.diferenca || 0) === 0).length);
    const sobra = Number(inv?.total_sobra ?? itens.filter(item => item.contado && Number(item.diferenca || 0) > 0).length);
    const falta = Number(inv?.total_falta ?? itens.filter(item => item.contado && Number(item.diferenca || 0) < 0).length);
    const divergencias = Number(inv?.total_divergencias ?? sobra + falta);
    return { total, contados, pendentes, semDivergencia, sobra, falta, divergencias };
  }
  recalcularItem(item: InventarioEstoqueItem): void {
    const contado = Number(item.saldo_contado || 0);
    const sistema = Number(item.saldo_sistema || 0);
    item.diferenca = Number((contado - sistema).toFixed(3));
  }
  get itensSelecionadosFiltrados(): InventarioEstoqueItem[] {
    const term = this.normalize(this.itemSearch);
    return (this.selecionado?.itens || []).filter(item => {
      const matchesSearch = !term || [
        item.CodigodeBarra,
        item.referencia,
        item.produto_descricao,
        item.cor,
        item.tamanho,
      ].some(v => this.normalize(v).includes(term));
      const diff = Number(item.diferenca || 0);
      const matchesSituacao =
        this.itemSituacao === 'todos'
        || (this.itemSituacao === 'pendentes' && !item.contado)
        || (this.itemSituacao === 'contados' && !!item.contado)
        || (this.itemSituacao === 'divergentes' && !!item.contado && diff !== 0);
      return matchesSearch && matchesSituacao;
    });
  }
  get importInvalidasPreview(): Array<{ linha: number; ean: string; erros: string[] }> {
    return (this.importPreview?.invalidas || []).slice(0, 6);
  }
  get totalInventarios(): number { return this.inventarios.length; }
  get abertos(): number { return this.inventarios.filter(i => i.status === 'ABERTO').length; }
  get validados(): number { return this.inventarios.filter(i => i.status === 'VALIDADO').length; }
  get finalizados(): number { return this.inventarios.filter(i => i.status === 'FECHADO').length; }
  get inventariosFiltrados(): InventarioEstoque[] {
    const term = this.normalize(this.search);
    return this.inventarios.filter(inv => {
      const matchesSearch = !term || [inv.descricao, inv.status, inv.documento, inv.observacao, this.lojaNome(inv.Idloja)].some(v => this.normalize(v).includes(term));
      const matchesLoja = !this.filterLoja || Number(inv.Idloja) === Number(this.filterLoja);
      const matchesStatus = !this.filterStatus || inv.status === this.filterStatus;
      return matchesSearch && matchesLoja && matchesStatus;
    });
  }
  get inventariosPaginados(): InventarioEstoque[] {
    const start = (this.page - 1) * this.pageSize;
    return this.inventariosFiltrados.slice(start, start + this.pageSize);
  }
  get totalFiltrado(): number { return this.inventariosFiltrados.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalFiltrado / this.pageSize)); }
  get pageStart(): number { return this.totalFiltrado ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.totalFiltrado); }
  get searchSuggestions(): string[] {
    return Array.from(new Set(this.inventarios.flatMap(inv => [inv.descricao, inv.status, inv.documento || '', inv.observacao || '', this.lojaNome(inv.Idloja)]).filter(Boolean)));
  }
  percent(part: number): string { return this.totalInventarios ? `${Math.round((part / this.totalInventarios) * 100)}% do total` : '0% do total'; }
  moneyLike(value: number | string | null | undefined): string { return String(value ?? '0'); }
  private unwrap<T>(res: any): T[] { return Array.isArray(res) ? res : (res?.results ?? []); }
  private today(): string { return new Date().toISOString().slice(0, 10); }
  private errorText(err: any, fallback: string): string {
    return err?.error?.detail || err?.error?.message || fallback;
  }
  private normalize(value: any): string {
    return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }
  private aplicarItemAtualizado(item: InventarioEstoqueItem): void {
    if (!this.selecionado) return;
    const itens = this.selecionado.itens || [];
    const idx = itens.findIndex(row => row.Idinventarioitem === item.Idinventarioitem || row.CodigodeBarra === item.CodigodeBarra);
    if (idx >= 0) {
      itens[idx] = { ...itens[idx], ...item };
    } else {
      itens.push(item);
      this.selecionado.itens = itens;
      this.selecionado.total_itens = Number(this.selecionado.total_itens || 0) + 1;
    }
    this.atualizarTotaisSelecionado();
  }
  private prepararQuantidadeScanner(item: InventarioEstoqueItem, ean: string): void {
    this.scannerItem = item;
    this.scannerQuantidade = Number(item.saldo_contado || 0);
    this.itemSearch = ean;
    this.itemSituacao = 'todos';
    this.successMsg = `SKU localizado: ${ean}.`;
    this.scannerEan = '';
  }
  private limparScanner(focus: boolean): void {
    this.scannerEan = '';
    if (focus) this.focarScanner();
  }
  private focarScanner(): void {
    setTimeout(() => this.scannerInput?.nativeElement?.focus(), 0);
  }
  private atualizarTotaisSelecionado(): void {
    if (!this.selecionado?.itens) return;
    this.selecionado.total_contados = this.selecionado.itens.filter(item => item.contado).length;
    this.selecionado.total_pendentes = this.selecionado.itens.filter(item => !item.contado).length;
    this.selecionado.total_sem_divergencia = this.selecionado.itens.filter(item => item.contado && Number(item.diferenca || 0) === 0).length;
    this.selecionado.total_sobra = this.selecionado.itens.filter(item => item.contado && Number(item.diferenca || 0) > 0).length;
    this.selecionado.total_falta = this.selecionado.itens.filter(item => item.contado && Number(item.diferenca || 0) < 0).length;
    this.selecionado.total_divergencias = Number(this.selecionado.total_sobra) + Number(this.selecionado.total_falta);
    this.selecionado.saldo_contado_total = this.selecionado.itens.reduce((total, item) => total + Number(item.saldo_contado || 0), 0);
    this.selecionado.diferenca_total = this.selecionado.itens.reduce((total, item) => total + Number(item.diferenca || 0), 0);
  }
  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.estoque-inventario.pageSize'));
    if ([10, 20, 50, 100].includes(size)) this.pageSize = size;
    const raw = localStorage.getItem(this.columnsStorageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Record<string, boolean>;
      this.columns = this.columns.map(c => c.required ? c : { ...c, visible: saved[c.key] ?? c.visible });
    } catch {}
  }
  private saveColumnsPreference(): void {
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(Object.fromEntries(this.columns.map(c => [c.key, c.visible]))));
  }
  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try {
      const pref = JSON.parse(raw) as { indicatorsVisible?: boolean; filtersVisible?: boolean };
      this.indicatorsVisible = pref.indicatorsVisible !== false;
      this.filtersVisible = pref.filtersVisible !== false;
    } catch {}
  }
  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible }));
  }
}
