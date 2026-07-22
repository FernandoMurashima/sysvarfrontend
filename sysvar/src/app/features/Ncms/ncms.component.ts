import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NcmsService } from '../../core/services/ncms.service';
import { Ncm } from '../../core/models/ncm';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';

@Component({
  selector: 'app-ncms',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent],
  templateUrl: './ncms.component.html',
  styleUrls: ['./ncms.component.css'],
})
export class NcmsComponent {
  private fb = inject(FormBuilder);
  private api = inject(NcmsService);
  private auth = inject(AuthService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;
  excluirModal: Ncm | null = null;
  columnsOpen = false;
  exportOpen = false;
  advancedOpen = false;
  filterCategoria = '';
  filterStatus = '';
  private readonly columnsStorageKey = 'sysvar.list.ncms.columns';
  columns = [
    { key: 'ncm', label: 'NCM', visible: true, required: true },
    { key: 'descricao', label: 'Descrição', visible: true, required: true },
    { key: 'categoria', label: 'Categoria', visible: true, required: false },
    { key: 'aliquota', label: 'Alíquota', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];

  items = signal<Ncm[]>([]);
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);

  filteredItems = computed(() => {
    const categoria = this.filterCategoria;
    const status = this.filterStatus;
    return this.items().filter(item => {
      if (categoria && item.categoria !== categoria) return false;
      if (status === 'ativo' && item.ativo === false) return false;
      if (status === 'inativo' && item.ativo !== false) return false;
      return true;
    });
  });

  total = computed(() => this.filteredItems().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredItems().slice(start, start + this.pageSize());
  });

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('fiscal', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('fiscal');
  }

  searchSuggestions = computed(() => {
    const valores = this.items().flatMap(item => [
      item.ncm,
      item.descricao,
      item.categoria,
      item.campo1
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  });

  showForm = false;
  editingId: number | null = null;
  consultando = false;
  form: FormGroup = this.fb.group({
    ncm: [null, [Validators.required, Validators.pattern(/^\d{4}\.\d{2}\.\d{2}$/)]],
    descricao: ['', [Validators.required, Validators.maxLength(1000)]],
    categoria: ['OUTROS', Validators.required],
    aliquota: [null],
    campo1: [null, [Validators.maxLength(25)]],
    ativo: [true],
  });

  constructor() {
    effect(() => { const tp = this.totalPages(); if (this.page() > tp) this.page.set(tp); });
    this.loadColumnsPreference();
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.list(this.search).subscribe({
      next: rows => { this.items.set(rows); this.page.set(1); },
      error: () => { this.successMsg.set(null); this.items.set([]); this.openErrorOverlay(); this.loading.set(false); },
      complete: () => this.loading.set(false),
    });
  }
  doSearch() { this.load(); }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  clearSearch() { this.search = ''; this.load(); }
  doFilter() { this.page.set(1); }
  clearFilters() { this.search = ''; this.filterCategoria = ''; this.filterStatus = ''; this.load(); }
  onPageSizeChange(v: number) { this.pageSize.set(+v); this.page.set(1); }
  firstPage() { this.page.set(1); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); }
  lastPage() { this.page.set(this.totalPages()); }

  novo() {
    this.showForm = true; this.editingId = null; this.submitted = false;
    this.consultando = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ ncm: null, descricao: '', categoria: 'OUTROS', aliquota: null, campo1: null, ativo: true });
  }

  editar(row: Ncm) {
    this.showForm = true; this.editingId = row.id ?? null; this.submitted = false;
    this.consultando = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      ncm: row.ncm ?? null,
      descricao: row.descricao ?? '',
      categoria: row.categoria ?? 'OUTROS',
      aliquota: row.aliquota ?? null,
      campo1: row.campo1 ?? null,
      ativo: row.ativo !== false,
    });
  }

  consultar(row: Ncm) {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  cancelarEdicao() {
    this.showForm = false; this.editingId = null; this.consultando = false; this.form.enable({ emitEvent: false }); this.form.reset();
  }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }
    const body: Partial<Ncm> = this.form.value;
    this.saving = true;

    const req = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    req.subscribe({
      next: () => { this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'NCM criado.'); this.cancelarEdicao(); this.load(); },
      error: (err) => {
        const controls = this.form.controls as any;
        if (err?.error) {
          Object.entries(err.error).forEach(([k, v]: any) => {
            if (controls[k]) controls[k].setErrors({ server: Array.isArray(v) ? v[0] : v });
          });
        }
        this.openErrorOverlay(); this.saving = false;
      },
      complete: () => (this.saving = false),
    });
  }

  excluir(row: Ncm) {
    if (!this.podeExcluirModulo) return;
    if (!row.id) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const row = this.excluirModal;
    if (!row?.id) return;
    this.api.delete(row.id).subscribe(() => {
      this.excluirModal = null;
      this.successMsg.set('NCM excluído.');
      this.load();
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  rowActions(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '×', danger: true, dividerBefore: true, visible: this.podeExcluirModulo },
    ];
  }

  executarAcao(key: string | Event, row: Ncm): void {
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
    const headers = ['NCM', 'Descrição', 'Categoria', 'Alíquota', 'Status'];
    const body = this.filteredItems().map(r => [
      r.ncm || '',
      r.descricao || '',
      this.categoriaLabel(r.categoria),
      r.aliquota ?? '',
      r.ativo === false ? 'Inativo' : 'Ativo',
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ncms.csv';
    link.click();
    URL.revokeObjectURL(url);
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

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['ncm']?.invalid) {
      if (f['ncm'].errors?.['required']) msgs.push('NCM: obrigatório.');
      if (f['ncm'].errors?.['pattern']) msgs.push('NCM: use ####.##.##.');
    }
    if (f['descricao']?.invalid) {
      if (f['descricao'].errors?.['required']) msgs.push('Descrição: obrigatória.');
      if (f['descricao'].errors?.['maxlength']) msgs.push('Descrição: máx. 1000 caracteres.');
    }
    if (f['categoria']?.invalid) msgs.push('Categoria: obrigatória.');
    if (f['campo1']?.invalid && f['campo1'].errors?.['maxlength']) msgs.push('Campo1: máx. 25 caracteres.');
    for (const k of Object.keys(f)) if ((f as any)[k].errors?.['server']) msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    return msgs;
  }

  categoriaLabel(v: string | null | undefined): string {
    return ({ VESTUARIO: 'Vestuário', TECIDO: 'Tecidos', AVIAMENTO: 'Aviamentos', EMBALAGEM: 'Embalagens', OUTROS: 'Outros' } as any)[v || ''] || 'Outros';
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }
}
