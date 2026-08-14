import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Observable } from 'rxjs';

import { Produto } from '../../core/models/produto';
import { ProdutosService } from '../../core/services/produtos.service';

import { UnidadesService } from '../../core/services/unidades.service';
import { NcmsService } from '../../core/services/ncms.service';
import { MateriaisService } from '../../core/services/material.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';

type ItemRef = { id: number; label: string };

@Component({
  selector: 'app-insumos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    SearchSuggestComponent,
    PageHeaderComponent,
    RowActionsMenuComponent,
    SummaryCardComponent,
  ],
  templateUrl: './insumos.component.html',
  styleUrls: ['./insumos.component.css'],
})
export class InsumosComponent {
  private fb = inject(FormBuilder);
  private api = inject(ProdutosService);
  private auth = inject(AuthService);

  private unidadesApi = inject(UnidadesService);
  private ncmsApi = inject(NcmsService);
  private materiaisApi = inject(MateriaisService);

  // navegação
  view = signal<'list' | 'form' | 'consulta'>('list');
  setViewList() { this.view.set('list'); this.cancelarEdicao(); this.load(); }
  setViewForm() { this.view.set('form'); }

  // flags
  search = '';
  filterUnidade = '';
  filterStatus = '';
  filterNcm = '';
  filterReferencia = '';
  filterMaterial = '';
  filterFiscal = '';
  filterCodigo = '';
  advancedOpen = false;
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;
  excluirModal: Produto | null = null;
  segurancaModal: {
    action: 'inativar';
    produto: Produto;
    title: string;
    motivo: string;
    senha: string;
  } | null = null;
  columnsOpen = false;
  exportOpen = false;
  selectedProduto = signal<Produto | null>(null);
  indicatorsVisible = true;
  filtersVisible = true;
  private readonly columnsStorageKey = 'sysvar.list.insumos.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.insumos';
  columns = [
    { key: 'referencia', label: 'Código', visible: true, required: false },
    { key: 'reduzido', label: 'Descrição reduzida', visible: true, required: false },
    { key: 'unidade', label: 'Unidade', visible: true, required: false },
    { key: 'material', label: 'Material', visible: true, required: false },
    { key: 'ncm', label: 'NCM', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];

  // lista / pager
  produtos = signal<Produto[]>([]);
  totalRecords = signal(0);
  indicadoresSrv = signal({ total: 0, ativos: 0, inativos: 0, cadastro_fiscal_incompleto: 0 });
  consultaProduto = signal<Produto | null>(null);
  consultaHistorico = signal<any[]>([]);
  consultaMovimentacoes = signal<any[]>([]);
  readonly historicoFieldLabels: Record<string, string> = {
    descricao: 'Descrição',
    descricao_reduzida: 'Descrição reduzida',
    unidade: 'Unidade',
    ncm: 'NCM',
    origem_mercadoria: 'Origem',
    csosn_ou_cst_icms: 'CST/CSOSN',
    aliquota_icms: 'ICMS',
    cfop_venda_dentro: 'CFOP dentro',
    cfop_venda_fora: 'CFOP fora',
    cst_pis: 'CST PIS',
    aliq_pis: 'PIS',
    cst_cofins: 'CST COFINS',
    aliq_cofins: 'COFINS',
    ipi_situacao: 'Situação IPI',
    aliq_ipi: 'IPI',
    observacoes: 'Observações',
    ativo: 'Status',
  };
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);

  produtosFiltrados = computed(() => this.produtos());
  total = computed(() => this.totalRecords());
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalRecords() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  paged = computed(() => {
    return this.produtos();
  });
  searchSuggestions = computed(() => this.produtos().flatMap(p => [
    p.descricao,
    p.descricao_reduzida,
    p.referencia,
    p.ncm,
    this.unidadeLabel(p.unidade ?? null),
    this.materialLabel(p.material ?? null),
  ].filter((v): v is string => !!v)));

  indicadores = computed(() => {
    return this.indicadoresSrv();
  });

  // form
  showForm = false;
  editingId: number | null = null;
  consultando = false;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('produtos', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('produtos');
  }

  form: FormGroup = this.fb.group({
    tipo_produto: ['4', [Validators.required]],
    referencia: [{ value: '', disabled: true }],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    descricao_reduzida: [null, [Validators.required, Validators.maxLength(60)]],

    unidade: [null, [Validators.required]],
    material: [null],

    // NCM opcional (se preencher, tem que ser ####.##.##)
    ncm: [null, [Validators.pattern(/^\d{4}\.\d{2}\.\d{2}$/)]],
    origem_mercadoria: [null],
    csosn_ou_cst_icms: [null],
    aliquota_icms: [null],
    cfop_venda_dentro: [null],
    cfop_venda_fora: [null],
    cst_pis: [null],
    aliq_pis: [null],
    cst_cofins: [null],
    aliq_cofins: [null],
    ipi_situacao: [null],
    aliq_ipi: [null],

    observacoes: [null],
  });

  // streams/options
  ncms$: Observable<any[]> = this.ncmsApi.list('');

  unidades: ItemRef[] = [];
  materiais: ItemRef[] = [];

  private unidadeMap = new Map<number, string>();
  private materialMap = new Map<number, string>();

  constructor() {
    effect(() => {
      const tp = this.totalPages();
      if (this.page() > tp) this.page.set(tp);
      const selected = this.selectedProduto();
      if (selected && !this.produtosFiltrados().some(p => p.Idproduto === selected.Idproduto)) {
        this.selectedProduto.set(null);
      }
    });

    this.loadLookups();
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.load();
  }

  // util
  private arrayOrResults<T>(data: any): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && Array.isArray(data.results)) return data.results as T[];
    return [];
  }

  // lookups
  private loadLookups() {
    this.unidadesApi.list({ search: '', ordering: 'Descricao', page_size: 200 }).subscribe({
      next: (rows: any) => {
        const arr = this.arrayOrResults<any>(rows);
        this.unidades = arr.slice().sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || '')).map(u => ({ id: u.Idunidade as number, label: u.Descricao as string }));
        this.unidadeMap.clear();
        this.unidades.forEach(u => this.unidadeMap.set(u.id, u.label));
      },
      error: () => { this.unidades = []; }
    });
    this.materiaisApi.list('').subscribe({
      next: (rows: any[]) => {
        this.materiais = rows.slice().sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || '')).map(m => ({ id: m.Idmaterial as number, label: m.Descricao as string }));
        this.materialMap.clear();
        this.materiais.forEach(m => this.materialMap.set(m.id, m.label));
      },
      error: () => { this.materiais = []; }
    });
  }

  // lista / pager
  load() {
    this.loading.set(true);
    const params = this.listParams();
    this.api.indicadoresInsumos(params).subscribe({ next: (resp: any) => this.indicadoresSrv.set(resp) });
    this.api.list(params).subscribe({
      next: (data: any) => {
        const rows = this.arrayOrResults<Produto>(data)
          .filter(p => p.tipo_produto === '4');
        this.produtos.set(rows);
        this.totalRecords.set(typeof data?.count === 'number' ? data.count : rows.length);
      },
      error: () => {
        this.produtos.set([]);
        this.openErrorOverlay();
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  private listParams(): any {
    return {
      ordering: '-data_cadastro',
      ativo: this.filterStatus === 'ATIVO' ? 'true' : this.filterStatus === 'INATIVO' ? 'false' : 'all',
      tipo_produto: '4',
      page: this.page(),
      page_size: this.pageSize(),
      search: this.search || undefined,
      referencia: this.filterReferencia || undefined,
      codigo: this.filterCodigo || undefined,
      unidade: this.filterUnidade || undefined,
      material: this.filterMaterial || undefined,
      ncm: this.filterNcm || undefined,
      cadastro_fiscal_incompleto: this.filterFiscal || undefined,
    };
  }

  doSearch() { this.page.set(1); this.load(); }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  clearSearch() {
    this.search = '';
    this.filterUnidade = '';
    this.filterStatus = '';
    this.filterNcm = '';
    this.filterMaterial = '';
    this.filterFiscal = '';
    this.filterReferencia = '';
    this.filterCodigo = '';
    this.page.set(1);
    this.load();
  }
  onPageSizeChange(v: number) { this.pageSize.set(+v); localStorage.setItem('sysvar.list.insumos.pageSize', String(this.pageSize())); this.page.set(1); this.load(); }
  firstPage() { this.page.set(1); this.load(); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); this.load(); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); this.load(); }
  lastPage() { this.page.set(this.totalPages()); this.load(); }

  unidadeLabel(id?: number | null) {
    if (!id) return '';
    return this.unidadeMap.get(id) ?? String(id);
  }

  materialLabel(id?: number | null) {
    if (!id) return '';
    return this.materialMap.get(id) ?? String(id);
  }

  tipoProdutoLabel(tipo?: string | null): string {
    return 'Insumo de Produção';
  }

  statusLabel(p: Produto): string {
    return p.ativo === false ? 'Inativo' : 'Ativo';
  }

  percentual(valor: number): string {
    const total = this.indicadores().total || 0;
    if (!total) return '0% do total';
    return `${((valor / total) * 100).toFixed(0)}% do total`;
  }

  visibleColumn(key: string): boolean {
    return this.columns.find(c => c.key === key)?.visible !== false;
  }

  toggleColumn(key: string, checked: boolean): void {
    const col = this.columns.find(c => c.key === key);
    if (!col || col.required) return;
    col.visible = checked;
    this.saveColumnsPreference();
  }

  rowActions(row: Produto): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'inativar', label: row.ativo ? 'Inativar' : 'Ativar', icon: '⊘', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string, row: Produto): void {
    if (action === 'consultar') this.consultar(row);
    if (action === 'editar') this.editar(row);
    if (action === 'inativar') this.toggleAtivo(row);
    if (action === 'excluir') this.excluir(row);
  }

  selecionarProduto(row: Produto): void {
    this.selectedProduto.set(this.isSelected(row) ? null : row);
  }

  isSelected(row: Produto): boolean {
    return !!this.selectedProduto() && this.selectedProduto()?.Idproduto === row.Idproduto;
  }

  consultarSelecionado(): void {
    const row = this.selectedProduto();
    if (row) this.consultar(row);
  }

  editarSelecionado(): void {
    const row = this.selectedProduto();
    if (row && this.podeEditarModulo) this.editar(row);
  }

  alternarAtivoSelecionado(): void {
    const row = this.selectedProduto();
    if (row && this.podeEditarModulo) this.toggleAtivo(row);
  }

  excluirSelecionado(): void {
    const row = this.selectedProduto();
    if (row && this.podeExcluirModulo) this.excluir(row);
  }

  toggleIndicators(): void {
    this.indicatorsVisible = !this.indicatorsVisible;
    this.saveViewPreference();
  }

  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
    this.saveViewPreference();
  }

  restoreViewPreference(): void {
    localStorage.removeItem(this.viewPrefsKey);
    localStorage.removeItem('sysvar.list.insumos.pageSize');
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.pageSize.set(20);
    this.columns = this.columns.map(c => ({ ...c, visible: true }));
    this.saveColumnsPreference();
    this.page.set(1);
  }

  @HostListener('window:sysvar-insumos-toggle-indicators')
  onToggleIndicatorsEvent(): void { this.toggleIndicators(); }

  @HostListener('window:sysvar-insumos-toggle-filters')
  onToggleFiltersEvent(): void { this.toggleFilters(); }

  @HostListener('window:sysvar-insumos-restore-view')
  onRestoreViewEvent(): void { this.restoreViewPreference(); }

  exportarCsv(): void {
    const headers = ['Descrição', 'Código', 'Descrição reduzida', 'Unidade', 'Material', 'NCM', 'Status'];
    const body = this.produtosFiltrados().map(p => [
      p.descricao || '',
      p.referencia || '',
      p.descricao_reduzida || '',
      this.unidadeLabel(p.unidade ?? null),
      this.materialLabel(p.material ?? null),
      p.ncm || '',
      this.statusLabel(p),
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'insumos.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.exportOpen = false;
  }

  // form
  novo() {
    this.setViewForm();
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      tipo_produto: '4',
      referencia: '',
      descricao: '',
      descricao_reduzida: null,
      unidade: null,
      material: null,
      ncm: null,
      origem_mercadoria: null,
      csosn_ou_cst_icms: null,
      aliquota_icms: null,
      cfop_venda_dentro: null,
      cfop_venda_fora: null,
      cst_pis: null,
      aliq_pis: null,
      cst_cofins: null,
      aliq_cofins: null,
      ipi_situacao: null,
      aliq_ipi: null,
      observacoes: null,
    });
  }

  editar(row: Produto) {
    if (!row.Idproduto) return;
    this.setViewForm();
    this.showForm = true;
    this.editingId = row.Idproduto ?? null;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.loading.set(true);
    this.api.get(row.Idproduto).subscribe({
      next: (produtoAtual) => this.preencherFormulario(produtoAtual),
      error: () => {
        this.showError('Falha ao carregar insumo atualizado.');
        this.setViewList();
      },
      complete: () => this.loading.set(false),
    });
  }

  private preencherFormulario(row: Produto): void {
    this.form.reset({
      tipo_produto: '4',
      referencia: row.referencia ?? '',
      descricao: row.descricao ?? '',
      descricao_reduzida: row.descricao_reduzida ?? null,
      unidade: row.unidade ?? null,
      material: row.material ?? null,
      ncm: row.ncm ?? null,
      origem_mercadoria: row.origem_mercadoria ?? null,
      csosn_ou_cst_icms: row.csosn_ou_cst_icms ?? null,
      aliquota_icms: row.aliquota_icms ?? null,
      cfop_venda_dentro: row.cfop_venda_dentro ?? null,
      cfop_venda_fora: row.cfop_venda_fora ?? null,
      cst_pis: row.cst_pis ?? null,
      aliq_pis: row.aliq_pis ?? null,
      cst_cofins: row.cst_cofins ?? null,
      aliq_cofins: row.aliq_cofins ?? null,
      ipi_situacao: row.ipi_situacao ?? null,
      aliq_ipi: row.aliq_ipi ?? null,
      observacoes: row.observacoes ?? null,
    });
  }

  consultar(row: Produto) {
    if (!row.Idproduto) return;
    this.view.set('consulta');
    this.showForm = false;
    this.consultando = true;
    this.loading.set(true);
    this.consultaProduto.set(null);
    this.consultaHistorico.set([]);
    this.consultaMovimentacoes.set([]);
    this.api.get(row.Idproduto).subscribe({
      next: (produtoAtual) => this.consultaProduto.set(produtoAtual),
      error: () => {
        this.showError('Falha ao carregar insumo atualizado.');
        this.setViewList();
      },
      complete: () => this.loading.set(false),
    });
    this.api.historico(row.Idproduto, { page_size: 20 }).subscribe({
      next: (resp: any) => this.consultaHistorico.set(this.arrayOrResults<any>(resp)),
      error: () => this.consultaHistorico.set([]),
    });
    this.consultaMovimentacoes.set([]);
  }

  cancelarEdicao() {
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.consultaProduto.set(null);
    this.consultaHistorico.set([]);
    this.consultaMovimentacoes.set([]);
    this.form.enable({ emitEvent: false });
    this.form.reset();
  }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }

    const body: Partial<Produto> = {
      ...this.form.value,
      grade: null,
      colecao: null,
      grupo: null,
      subgrupo: null,
      material: this.form.value.material ?? null,
      tipo_produto: '4',
      referencia: undefined, // não deve ser enviada
    };

    this.saving = true;

    const req = this.editingId
      ? this.api.update(this.editingId, body)
      : this.api.create(body);

    req.subscribe({
      next: (produtoSalvo: Produto) => {
        this.finishSave();
      },
      error: (err) => {
        const controls = this.form.controls as any;
        if (err?.error) {
          Object.entries(err.error).forEach(([k, v]: any) => {
            if (controls[k]) controls[k].setErrors({ server: Array.isArray(v) ? v[0] : v });
          });
        }
        this.openErrorOverlay();
        this.saving = false;
      }
    });
  }

  private finishSave() {
    const isEdit = !!this.editingId;
    this.saving = false;
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.form.reset();
    this.view.set('list');
    this.load();
    this.showSuccess(isEdit ? 'Alterações salvas.' : 'Produto criado.');
  }

  historicoTitulo(evento: string): string {
    const labels: Record<string, string> = {
      CRIACAO: 'Criação',
      ALTERACAO_CADASTRAL: 'Alteração cadastral',
      ALTERACAO_FISCAL: 'Alteração fiscal',
      ATIVACAO: 'Ativação',
      INATIVACAO: 'Inativação',
      EXCLUSAO: 'Exclusão',
      ENTRADA_ESTOQUE: 'Entrada de estoque',
      CONSUMO_INTERNO: 'Consumo interno',
      AJUSTE_ESTOQUE: 'Ajuste de estoque',
    };
    return labels[evento] || evento || 'Evento';
  }

  historicoDiferencas(h: any): Array<{ campo: string; anterior: string; novo: string }> {
    const anteriores = h?.dados_anteriores || {};
    const novos = h?.dados_novos || {};
    const keys = Array.from(new Set([...Object.keys(anteriores), ...Object.keys(novos)]));
    return keys.map(key => ({
      campo: this.historicoFieldLabels[key] || key,
      anterior: this.valorHistorico(key, anteriores[key]),
      novo: this.valorHistorico(key, novos[key]),
    }));
  }

  private valorHistorico(key: string, value: any): string {
    if (value === null || value === undefined || value === '') return '—';
    if (key === 'unidade') return this.unidadeLabel(Number(value));
    if (key === 'ativo') return value === true || value === 'True' || value === 'true' ? 'Ativo' : 'Inativo';
    return String(value);
  }

  excluir(row: Produto) {
    if (!this.podeExcluirModulo) return;
    if (!row.Idproduto) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const row = this.excluirModal;
    if (!row?.Idproduto) return;
    this.api.remove(row.Idproduto).subscribe({
      next: () => {
        this.excluirModal = null;
        this.showSuccess('Produto excluído.');
        this.load();
      },
      error: () => this.showError('Falha ao excluir Produto.')
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  // flags (reaproveita endpoints do backend)
  async toggleAtivo(row: Produto) {
    if (!row.Idproduto) return;
    if (row.ativo) {
      this.segurancaModal = {
        action: 'inativar',
        produto: row,
        title: 'Inativar Insumo',
        motivo: '',
        senha: '',
      };
    } else {
      this.api.ativarProduto(row.Idproduto).subscribe({
        next: (resp) => {
          this.replaceRow(resp as any);
          this.showSuccess('Insumo ativado.');
        },
        error: (err) => this.showError(String(err?.error?.detail || 'Falha ao ativar'))
      });
    }
  }

  confirmarSeguranca(): void {
    const modal = this.segurancaModal;
    const id = modal?.produto.Idproduto;
    if (!modal || !id) return;
    const motivo = modal.motivo.trim();
    if (motivo.length < 3 || !modal.senha) {
      this.showError('Informe motivo com pelo menos 3 caracteres e a senha.');
      return;
    }
    const req = this.api.inativarProduto(id, motivo, modal.senha);
    req.subscribe({
      next: (resp: any) => {
        this.replaceRow(resp);
        this.showSuccess('Insumo inativado.');
        this.segurancaModal = null;
      },
      error: (err) => this.showError(String(err?.error?.detail || 'Falha ao concluir a operação.'))
    });
  }

  fecharSeguranca(): void {
    this.segurancaModal = null;
  }

  private replaceRow(newRow: Produto) {
    const rows = this.produtos().slice();
    const ix = rows.findIndex(r => r.Idproduto === newRow.Idproduto);
    if (ix >= 0) rows[ix] = newRow;
    this.produtos.set(rows);
  }

  private showSuccess(message: string): void {
    this.successMsg.set(message);
    this.errorMsg.set(null);
  }

  private showError(message: string): void {
    this.errorMsg.set(message);
    this.successMsg.set(null);
  }

  // overlay
  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;

    if (f['descricao']?.invalid) {
      if (f['descricao'].errors?.['required']) msgs.push('Descrição: obrigatório.');
      if (f['descricao'].errors?.['maxlength']) msgs.push('Descrição: máx. 120 caracteres.');
    }
    if (f['descricao_reduzida']?.invalid) {
      if (f['descricao_reduzida'].errors?.['required']) msgs.push('Descrição reduzida: obrigatória.');
      if (f['descricao_reduzida'].errors?.['maxlength']) msgs.push('Descrição reduzida: máx. 60 caracteres.');
    }

    if (f['unidade']?.invalid && f['unidade'].errors?.['required'])
      msgs.push('Unidade: obrigatória.');

    if (f['ncm']?.invalid) {
      if (f['ncm'].errors?.['pattern']) msgs.push('NCM: use ####.##.##.');
      if ((f as any)['ncm']?.errors?.['server']) msgs.push(`NCM: ${(f as any)['ncm']?.errors?.['server']}`);
    }

    for (const k of Object.keys(f)) {
      if ((f as any)[k].errors?.['server'] && !msgs.some(m => m.includes(k)))
        msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    }
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }

  private normalize(value: string): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.insumos.pageSize'));
    if ([10, 20, 50].includes(size)) this.pageSize.set(size);
    const raw = localStorage.getItem(this.columnsStorageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Record<string, boolean>;
      this.columns = this.columns.map(c => c.required ? c : { ...c, visible: saved[c.key] ?? c.visible });
    } catch {
      return;
    }
  }

  private saveColumnsPreference(): void {
    const state = Object.fromEntries(this.columns.map(c => [c.key, c.visible]));
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(state));
  }

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try {
      const pref = JSON.parse(raw) as { indicatorsVisible?: boolean; filtersVisible?: boolean };
      this.indicatorsVisible = pref.indicatorsVisible !== false;
      this.filtersVisible = pref.filtersVisible !== false;
    } catch {
      return;
    }
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({
      indicatorsVisible: this.indicatorsVisible,
      filtersVisible: this.filtersVisible,
    }));
  }
}





