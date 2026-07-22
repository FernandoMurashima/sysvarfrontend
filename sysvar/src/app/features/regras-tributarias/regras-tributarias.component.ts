import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Cfop } from '../../core/models/cfop';
import { Ncm } from '../../core/models/ncm';
import { RegraTributaria } from '../../core/models/regra-tributaria';
import { Tributo } from '../../core/models/tributo';
import { CfopsService } from '../../core/services/cfops.service';
import { NcmsService } from '../../core/services/ncms.service';
import { RegrasTributariasService } from '../../core/services/regras-tributarias.service';
import { TributosService } from '../../core/services/tributos.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-regras-tributarias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent],
  templateUrl: './regras-tributarias.component.html',
  styleUrls: ['./regras-tributarias.component.css'],
})
export class RegrasTributariasComponent {
  private fb = inject(FormBuilder);
  private api = inject(RegrasTributariasService);
  private tributosApi = inject(TributosService);
  private cfopsApi = inject(CfopsService);
  private ncmsApi = inject(NcmsService);
  private auth = inject(AuthService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  submitted = false;
  saving = false;
  excluirModal: RegraTributaria | null = null;
  errorOverlayOpen = signal(false);
  columnsOpen = false;
  exportOpen = false;
  advancedOpen = false;
  filterOperacao = '';
  filterRegime = '';
  filterStatus = '';
  private readonly columnsStorageKey = 'sysvar.list.regras-tributarias.columns';
  columns = [
    { key: 'nome', label: 'Regra', visible: true, required: true },
    { key: 'tributo', label: 'Tributo', visible: true, required: true },
    { key: 'operacao', label: 'Operação', visible: true, required: false },
    { key: 'cfop', label: 'CFOP', visible: true, required: false },
    { key: 'ncm', label: 'NCM', visible: true, required: false },
    { key: 'regime', label: 'Regime', visible: true, required: false },
    { key: 'aliquota', label: 'Alíquota', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];
  items = signal<RegraTributaria[]>([]);
  tributos = signal<Tributo[]>([]);
  cfops = signal<Cfop[]>([]);
  ncms = signal<Ncm[]>([]);
  page = signal(1);
  pageSize = signal(20);
  pageSizeOptions = [10, 20, 50];
  filteredItems = computed(() => {
    return this.items().filter(item => {
      if (this.filterOperacao && item.tipo_operacao !== this.filterOperacao) return false;
      if (this.filterRegime && item.regime_tributario !== this.filterRegime) return false;
      if (this.filterStatus === 'ativo' && item.ativo === false) return false;
      if (this.filterStatus === 'inativo' && item.ativo !== false) return false;
      return true;
    });
  });
  total = computed(() => this.filteredItems().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
  paged = computed(() => this.filteredItems().slice((this.page() - 1) * this.pageSize(), this.page() * this.pageSize()));

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('fiscal', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('fiscal');
  }

  searchSuggestions = computed(() => {
    const valores = [
      ...this.items().flatMap(item => [
        item.nome,
        item.tipo_operacao,
        item.regime_tributario,
        item.tipo_produto,
        item.uf_origem,
        item.uf_destino,
        item.cst_csosn,
        item.tributo_codigo,
        item.tributo_descricao,
        item.cfop_codigo || '',
        item.ncm_codigo || '',
      ]),
      ...this.tributos().flatMap(t => [t.codigo, t.descricao]),
      ...this.cfops().flatMap(c => [c.codigo, c.descricao]),
      ...this.ncms().flatMap(n => [n.ncm, n.descricao])
    ].filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  });

  showForm = false;
  editingId: number | null = null;
  consultando = false;
  form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    tributo: [null, Validators.required],
    cfop: [null],
    ncm: [null],
    tipo_operacao: ['VENDA', Validators.required],
    regime_tributario: ['TODOS', Validators.required],
    tipo_produto: ['TODOS', Validators.required],
    uf_origem: ['', Validators.maxLength(2)],
    uf_destino: ['', Validators.maxLength(2)],
    cst_csosn: ['', Validators.maxLength(4)],
    base_calculo: ['VALOR_ITEM', Validators.required],
    aliquota: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    reducao_base: [0, [Validators.min(0), Validators.max(100)]],
    permite_credito: [false],
    compoe_custo: [false],
    entra_dre: [true],
    ativo: [true],
    vigencia_inicio: [new Date().toISOString().slice(0, 10), Validators.required],
    vigencia_fim: [null],
    observacoes: ['', Validators.maxLength(255)],
  });

  constructor() {
    effect(() => { if (this.page() > this.totalPages()) this.page.set(this.totalPages()); });
    this.loadColumnsPreference();
    this.loadLookups();
    this.load();
  }

  loadLookups() {
    this.tributosApi.list('').subscribe(rows => this.tributos.set(rows.filter(r => r.ativo)));
    this.cfopsApi.list('').subscribe(rows => this.cfops.set(rows.filter(r => r.ativo)));
    this.ncmsApi.list('').subscribe(rows => this.ncms.set(rows.filter(r => r.ativo !== false)));
  }

  load() {
    this.loading.set(true);
    this.api.list(this.search).subscribe({
      next: rows => { this.items.set(rows); this.page.set(1); },
      error: () => this.items.set([]),
      complete: () => this.loading.set(false),
    });
  }

  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }
  doFilter() { this.page.set(1); }
  clearFilters() { this.search = ''; this.filterOperacao = ''; this.filterRegime = ''; this.filterStatus = ''; this.load(); }
  onPageSizeChange(v: number) { this.pageSize.set(+v); this.page.set(1); }
  firstPage() { this.page.set(1); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); }
  lastPage() { this.page.set(this.totalPages()); }

  novo() {
    if (!this.podeEditarModulo) return;
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      nome: '', tributo: null, cfop: null, ncm: null, tipo_operacao: 'VENDA', regime_tributario: 'TODOS',
      tipo_produto: 'TODOS', uf_origem: '', uf_destino: '', cst_csosn: '', base_calculo: 'VALOR_ITEM',
      aliquota: 0, reducao_base: 0, permite_credito: false, compoe_custo: false, entra_dre: true,
      ativo: true, vigencia_inicio: new Date().toISOString().slice(0, 10), vigencia_fim: null, observacoes: ''
    });
  }

  editar(row: RegraTributaria) {
    if (!this.podeEditarModulo) return;
    this.showForm = true;
    this.editingId = row.id ?? null;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset(this.formValue(row));
  }

  consultar(row: RegraTributaria) {
    this.showForm = true;
    this.editingId = row.id ?? null;
    this.consultando = true;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset(this.formValue(row));
    this.form.disable({ emitEvent: false });
  }

  cancelarEdicao() {
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.form.enable({ emitEvent: false });
    this.form.reset();
  }

  salvar() {
    if (!this.podeEditarModulo) return;
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }
    const body = this.form.getRawValue();
    body.uf_origem = (body.uf_origem || '').toUpperCase() || null;
    body.uf_destino = (body.uf_destino || '').toUpperCase() || null;
    body.cst_csosn = body.cst_csosn || null;
    this.saving = true;
    const req = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    req.subscribe({
      next: () => { this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'Regra criada.'); this.cancelarEdicao(); this.load(); },
      complete: () => this.saving = false,
      error: (err) => {
        const controls = this.form.controls as any;
        if (err?.error) {
          Object.entries(err.error).forEach(([k, v]: any) => {
            if (controls[k]) controls[k].setErrors({ server: Array.isArray(v) ? v[0] : v });
          });
        }
        this.openErrorOverlay();
        this.saving = false;
      },
    });
  }

  excluir(row: RegraTributaria) { if (this.podeExcluirModulo) this.excluirModal = row; }
  confirmarExclusao() {
    if (!this.podeExcluirModulo || !this.excluirModal?.id) return;
    this.api.delete(this.excluirModal.id).subscribe(() => { this.excluirModal = null; this.successMsg.set('Regra excluída.'); this.load(); });
  }
  fecharExclusao() { this.excluirModal = null; }

  rowActions(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '×', danger: true, dividerBefore: true, visible: this.podeExcluirModulo },
    ];
  }

  executarAcao(key: string | Event, row: RegraTributaria): void {
    if (typeof key !== 'string') return;
    if (key === 'consultar') this.consultar(row);
    if (key === 'editar') this.editar(row);
    if (key === 'excluir') this.excluir(row);
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

  operacaoLabel(v: string | null | undefined): string {
    return ({ VENDA: 'Venda', COMPRA: 'Compra', DEVOLUCAO: 'Devolução', TRANSFERENCIA: 'Transferência', OUTROS: 'Outros' } as any)[v || ''] || (v || '-');
  }

  regimeLabel(v: string | null | undefined): string {
    return ({ TODOS: 'Todos', SIMPLES: 'Simples Nacional', LUCRO_PRESUMIDO: 'Lucro Presumido', LUCRO_REAL: 'Lucro Real' } as any)[v || ''] || (v || '-');
  }

  exportarCsv(): void {
    const headers = ['Regra', 'Tributo', 'Operação', 'CFOP', 'NCM', 'Regime', 'Alíquota', 'Status'];
    const body = this.filteredItems().map(r => [
      r.nome || '',
      r.tributo_codigo || r.tributo_descricao || '',
      this.operacaoLabel(r.tipo_operacao),
      r.cfop_codigo || 'Todos',
      r.ncm_codigo || 'Todos',
      this.regimeLabel(r.regime_tributario),
      `${r.aliquota ?? 0}%`,
      r.ativo ? 'Ativa' : 'Inativa',
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'regras-tributarias.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['nome']?.invalid) {
      if (f['nome'].errors?.['required']) msgs.push('Nome: obrigatório.');
      if (f['nome'].errors?.['maxlength']) msgs.push('Nome: máx. 120 caracteres.');
    }
    if (f['tributo']?.invalid) msgs.push('Tributo: obrigatório.');
    if (f['tipo_operacao']?.invalid) msgs.push('Operação: obrigatória.');
    if (f['regime_tributario']?.invalid) msgs.push('Regime: obrigatório.');
    if (f['tipo_produto']?.invalid) msgs.push('Tipo produto: obrigatório.');
    if (f['base_calculo']?.invalid) msgs.push('Base: obrigatória.');
    if (f['aliquota']?.invalid) msgs.push('Alíquota: informe um percentual entre 0 e 100.');
    if (f['reducao_base']?.invalid) msgs.push('Redução base: informe um percentual entre 0 e 100.');
    if (f['vigencia_inicio']?.invalid) msgs.push('Início vigência: obrigatório.');
    if (f['observacoes']?.invalid) msgs.push('Observações: máx. 255 caracteres.');
    for (const k of Object.keys(f)) if ((f as any)[k].errors?.['server']) msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }

  private formValue(row: RegraTributaria): RegraTributaria {
    return {
      ...row,
      cfop: row.cfop ?? null,
      ncm: row.ncm ?? null,
      uf_origem: row.uf_origem || '',
      uf_destino: row.uf_destino || '',
      cst_csosn: row.cst_csosn || '',
      observacoes: row.observacoes || '',
    };
  }

  private loadColumnsPreference(): void {
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
    const state: Record<string, boolean> = {};
    this.columns.forEach(c => state[c.key] = c.visible);
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(state));
  }
}
