import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MateriaisService } from '../../core/services/material.service';
import { Material } from '../../core/models/material';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';

@Component({
  selector: 'app-materiais',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent],
  templateUrl: './materiais.component.html',
  styleUrls: ['./materiais.component.css'],
})
export class MateriaisComponent {
  private fb = inject(FormBuilder);
  private api = inject(MateriaisService);
  private auth = inject(AuthService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;
  excluirModal: Material | null = null;
  columnsOpen = false;
  exportOpen = false;
  advancedOpen = false;
  filterStatus = '';
  private readonly columnsStorageKey = 'sysvar.list.materiais.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.material';
  selectedItem = signal<Material | null>(null);
  indicatorsVisible = true;
  filtersVisible = true;
  columns = [
    { key: 'descricao', label: 'Descrição', visible: true, required: true },
    { key: 'codigo', label: 'Código', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];

  items = signal<Material[]>([]);
  totalRecords = signal(0);
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);

  filteredItems = computed(() => this.items());
  total = computed(() => this.totalRecords());
  indicadores = computed(() => {
    const rows = this.items();
    const total = this.totalRecords();
    const ativos = rows.filter(i => !!i.Status).length;
    return { total, ativos, inativos: total - ativos, codigos: rows.filter(i => !!i.Codigo).length, descricoes: rows.filter(i => !!i.Descricao).length };
  });
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  paged = computed(() => this.items());
  searchSuggestions = computed(() => {
    const valores = this.items().flatMap(item => [
      item.Descricao,
      item.Codigo,
      item.Status
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  });
  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('fiscal', true) !== false; }
  get podeExcluirModulo(): boolean { return this.auth.podeExcluirModulo('fiscal'); }

  showForm = false;
  editingId: number | null = null;
  consultando = false;
  form: FormGroup = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: [null, [Validators.maxLength(10)]],
    Status: [null, [Validators.maxLength(10)]],
  });

  constructor() {
    effect(() => { const tp = this.totalPages(); if (this.page() > tp) this.page.set(tp); });
    effect(() => {
      const selected = this.selectedItem();
      if (selected && !this.filteredItems().some(item => item.Idmaterial === selected.Idmaterial)) this.selectedItem.set(null);
    });
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.list({ search: this.search || undefined, Status: this.filterStatus || undefined, page: this.page(), page_size: this.pageSize(), ordering: 'Descricao' }).subscribe({
      next: (resp: any) => { const rows = Array.isArray(resp) ? resp : (resp?.results ?? []); this.items.set(rows); this.totalRecords.set(Array.isArray(resp) ? rows.length : (resp?.count ?? rows.length)); },
      error: () => { this.successMsg.set(null); this.items.set([]); this.openErrorOverlay(); this.loading.set(false); },
      complete: () => this.loading.set(false),
    });
  }
  doSearch() { this.load(); }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  clearSearch() { this.search = ''; this.load(); }
  doFilter() { this.page.set(1); this.load(); }
  clearFilters() { this.search = ''; this.filterStatus = ''; this.load(); }
  onPageSizeChange(v: number) { this.pageSize.set(+v); localStorage.setItem('sysvar.list.materiais.pageSize', String(+v)); this.page.set(1); this.load(); }
  firstPage() { this.page.set(1); this.load(); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); this.load(); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); this.load(); }
  lastPage() { this.page.set(this.totalPages()); this.load(); }

  selecionarItem(row: Material): void { this.selectedItem.set(this.isSelected(row) ? null : row); }
  isSelected(row: Material): boolean { return !!this.selectedItem() && this.selectedItem()?.Idmaterial === row.Idmaterial; }
  consultarSelecionado(): void { const row = this.selectedItem(); if (row) this.consultar(row); }
  editarSelecionado(): void { const row = this.selectedItem(); if (row && this.podeEditarModulo) this.editar(row); }
  excluirSelecionado(): void { const row = this.selectedItem(); if (row && this.podeExcluirModulo) this.excluir(row); }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  restoreViewPreference(): void {
    localStorage.removeItem(this.viewPrefsKey);
    localStorage.removeItem('sysvar.list.materiais.pageSize');
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.pageSize.set(20);
    this.columns = this.columns.map(c => ({ ...c, visible: true }));
    this.saveColumnsPreference();
  }
  @HostListener('window:sysvar-material-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-material-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-material-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  novo() {
    if (!this.podeEditarModulo) return;
    this.showForm = true; this.editingId = null; this.submitted = false;
    this.consultando = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ Descricao: '', Codigo: null, Status: 'ATIVO' });
  }

  editar(row: Material, modoConsulta = false) {
    if (!modoConsulta && !this.podeEditarModulo) return;
    this.showForm = true; this.editingId = row.Idmaterial ?? null; this.submitted = false;
    this.consultando = modoConsulta;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      Descricao: row.Descricao ?? '',
      Codigo: row.Codigo ?? null,
      Status: row.Status ?? null,
    });
  }

  consultar(row: Material) {
    this.showForm = true; this.editingId = row.Idmaterial ?? null; this.submitted = false;
    this.consultando = true;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      Descricao: row.Descricao ?? '',
      Codigo: row.Codigo ?? null,
      Status: row.Status ?? null,
    });
    this.form.disable({ emitEvent: false });
  }

  cancelarEdicao() { this.showForm = false; this.editingId = null; this.consultando = false; this.form.enable({ emitEvent: false }); this.form.reset(); }

  salvar() {
    if (!this.podeEditarModulo) return;
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }
    const body: Partial<Material> = this.form.value;
    this.saving = true;

    const req = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    req.subscribe({
      next: () => { this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'Material criado.'); this.cancelarEdicao(); this.load(); },
      error: (err) => {
        const controls = this.form.controls as any;
        if (err?.error) {
          Object.entries(err.error).forEach(([k, v]: any) => { if (controls[k]) controls[k].setErrors({ server: Array.isArray(v) ? v[0] : v }); });
        }
        this.openErrorOverlay(); this.saving = false;
      },
      complete: () => (this.saving = false),
    });
  }

  excluir(row: Material) {
    if (!this.podeExcluirModulo) return;
    if (!row.Idmaterial) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const row = this.excluirModal;
    if (!row?.Idmaterial) return;
    this.api.delete(row.Idmaterial).subscribe(() => {
      this.excluirModal = null;
      this.successMsg.set('Material excluído.');
      this.load();
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['Descricao']?.invalid) {
      if (f['Descricao'].errors?.['required']) msgs.push('Descrição: obrigatória.');
      if (f['Descricao'].errors?.['maxlength']) msgs.push('Descrição: máx. 100 caracteres.');
    }
    if (f['Codigo']?.invalid && f['Codigo'].errors?.['maxlength']) msgs.push('Código: máx. 10 caracteres.');
    if (f['Status']?.invalid && f['Status'].errors?.['maxlength']) msgs.push('Status: máx. 10 caracteres.');
    for (const k of Object.keys(f)) if ((f as any)[k].errors?.['server']) msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }

  rowActions(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '×', danger: true, dividerBefore: true, visible: this.podeExcluirModulo },
    ];
  }

  executarAcao(key: string | Event, row: Material): void {
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

  exportarCsv(): void {
    const headers = ['Descrição', 'Código', 'Status'];
    const body = this.items().map(r => [
      r.Descricao || '',
      r.Codigo || '',
      r.Status ? 'Ativo' : 'Inativo',
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'materiais.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.materiais.pageSize'));
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
    const state: Record<string, boolean> = {};
    this.columns.forEach(c => state[c.key] = c.visible);
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(state));
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

