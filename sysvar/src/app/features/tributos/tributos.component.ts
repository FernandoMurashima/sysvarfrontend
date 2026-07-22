import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Tributo } from '../../core/models/tributo';
import { TributosService } from '../../core/services/tributos.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';

@Component({
  selector: 'app-tributos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent],
  templateUrl: './tributos.component.html',
  styleUrls: ['./tributos.component.css'],
})
export class TributosComponent {
  private fb = inject(FormBuilder);
  private api = inject(TributosService);
  private auth = inject(AuthService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  submitted = false;
  saving = false;
  excluirModal: Tributo | null = null;
  errorOverlayOpen = signal(false);
  columnsOpen = false;
  exportOpen = false;
  advancedOpen = false;
  filterEsfera = '';
  filterAtual = '';
  filterStatus = '';
  private readonly columnsStorageKey = 'sysvar.list.tributos.columns';
  columns = [
    { key: 'codigo', label: 'Código', visible: true, required: true },
    { key: 'descricao', label: 'Descrição', visible: true, required: true },
    { key: 'esfera', label: 'Esfera', visible: true, required: false },
    { key: 'atual', label: 'Atual', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];
  items = signal<Tributo[]>([]);
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);
  filteredItems = computed(() => {
    const esfera = this.filterEsfera;
    const atual = this.filterAtual;
    const status = this.filterStatus;
    return this.items().filter(item => {
      if (esfera && item.esfera !== esfera) return false;
      if (atual === 'sim' && !item.atual) return false;
      if (atual === 'nao' && item.atual) return false;
      if (status === 'ativo' && item.ativo === false) return false;
      if (status === 'inativo' && item.ativo !== false) return false;
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
    const valores = this.items().flatMap(item => [
      item.codigo,
      item.descricao,
      item.esfera
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  });

  showForm = false;
  editingId: number | null = null;
  consultando = false;
  form: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    esfera: ['FEDERAL', Validators.required],
    atual: [true],
    ativo: [true],
    observacoes: ['', Validators.maxLength(255)],
  });

  constructor() {
    effect(() => { if (this.page() > this.totalPages()) this.page.set(this.totalPages()); });
    this.loadColumnsPreference();
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.list(this.search).subscribe({
      next: rows => { this.items.set(rows); this.page.set(1); },
      error: () => { this.items.set([]); },
      complete: () => this.loading.set(false),
    });
  }
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }
  doFilter() { this.page.set(1); }
  clearFilters() { this.search = ''; this.filterEsfera = ''; this.filterAtual = ''; this.filterStatus = ''; this.load(); }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  onPageSizeChange(v: number) { this.pageSize.set(+v); this.page.set(1); }
  firstPage() { this.page.set(1); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); }
  lastPage() { this.page.set(this.totalPages()); }

  novo() {
    if (!this.podeEditarModulo) return;
    this.showForm = true; this.editingId = null; this.consultando = false; this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ codigo: '', descricao: '', esfera: 'FEDERAL', atual: true, ativo: true, observacoes: '' });
  }
  editar(row: Tributo) {
    if (!this.podeEditarModulo) return;
    this.showForm = true; this.editingId = row.id ?? null; this.consultando = false; this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ codigo: row.codigo, descricao: row.descricao, esfera: row.esfera, atual: row.atual, ativo: row.ativo, observacoes: row.observacoes || '' });
  }
  consultar(row: Tributo) {
    this.showForm = true; this.editingId = row.id ?? null; this.consultando = true; this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ codigo: row.codigo, descricao: row.descricao, esfera: row.esfera, atual: row.atual, ativo: row.ativo, observacoes: row.observacoes || '' });
    this.form.disable({ emitEvent: false });
  }
  cancelarEdicao() { this.showForm = false; this.editingId = null; this.consultando = false; this.form.enable({ emitEvent: false }); this.form.reset(); }
  salvar() {
    if (!this.podeEditarModulo) return;
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }
    this.saving = true;
    const req = this.editingId ? this.api.update(this.editingId, this.form.getRawValue()) : this.api.create(this.form.getRawValue());
    req.subscribe({
      next: () => { this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'Tributo criado.'); this.cancelarEdicao(); this.load(); },
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
  excluir(row: Tributo) { if (this.podeExcluirModulo) this.excluirModal = row; }
  confirmarExclusao() {
    if (!this.podeExcluirModulo) return;
    if (!this.excluirModal?.id) return;
    this.api.delete(this.excluirModal.id).subscribe(() => { this.excluirModal = null; this.successMsg.set('Tributo excluído.'); this.load(); });
  }
  fecharExclusao() { this.excluirModal = null; }

  rowActions(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '×', danger: true, dividerBefore: true, visible: this.podeExcluirModulo },
    ];
  }

  executarAcao(key: string | Event, row: Tributo): void {
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

  esferaLabel(v: string | null | undefined): string {
    return ({ FEDERAL: 'Federal', ESTADUAL: 'Estadual', MUNICIPAL: 'Municipal' } as any)[v || ''] || (v || '-');
  }

  exportarCsv(): void {
    const headers = ['Código', 'Descrição', 'Esfera', 'Atual', 'Status'];
    const body = this.filteredItems().map(r => [
      r.codigo || '',
      r.descricao || '',
      this.esferaLabel(r.esfera),
      r.atual ? 'Sim' : 'Não',
      r.ativo ? 'Ativo' : 'Inativo',
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tributos.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['codigo']?.invalid) {
      if (f['codigo'].errors?.['required']) msgs.push('Código: obrigatório.');
      if (f['codigo'].errors?.['maxlength']) msgs.push('Código: máx. 20 caracteres.');
    }
    if (f['descricao']?.invalid) {
      if (f['descricao'].errors?.['required']) msgs.push('Descrição: obrigatória.');
      if (f['descricao'].errors?.['maxlength']) msgs.push('Descrição: máx. 120 caracteres.');
    }
    if (f['esfera']?.invalid) msgs.push('Esfera: obrigatória.');
    if (f['observacoes']?.invalid) msgs.push('Observações: máx. 255 caracteres.');
    for (const k of Object.keys(f)) if ((f as any)[k].errors?.['server']) msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }

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
