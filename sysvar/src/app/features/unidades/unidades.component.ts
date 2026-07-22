import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UnidadesService } from '../../core/services/unidades.service';
import { Unidade } from '../../core/models/unidade';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { ListPaginationComponent } from '../../shared/components/list-pagination/list-pagination.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    SearchSuggestComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
    RowActionsMenuComponent,
    ListPaginationComponent,
    EmptyStateComponent
  ],
  templateUrl: './unidades.component.html',
  styleUrls: ['./unidades.component.css'],
})
export class UnidadesComponent implements OnInit {
  private fb  = inject(FormBuilder);
  private api = inject(UnidadesService);
  private auth = inject(AuthService);

  // UI/estado
  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;
  consultando = false;

  search = '';
  successMsg = '';
  errorMsg = '';
  excluirModal: Unidade | null = null;
  errorOverlayOpen = false;
  columnsOpen = false;
  sortKey: 'descricao' | 'codigo' | 'decimal' = 'descricao';
  sortDir: 'asc' | 'desc' = 'asc';
  private readonly columnsStorageKey = 'sysvar.list.unidades.columns';
  columns = [
    { key: 'codigo', label: 'Codigo', visible: true, required: false },
    { key: 'decimal', label: 'Decimal', visible: true, required: false },
  ];

  // form
  form: FormGroup = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: ['', [Validators.maxLength(10)]], // opcional no back; só limitamos tamanho
    permite_decimal: [false],
  });

  // lista + paginação client-side (igual Cores)
  unidadesAll: Unidade[] = [];
  unidades: Unidade[] = [];
  page = 1;
  pageSize = 20;
  pageSizeOptions = [20, 50, 100];
  total = 0;

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number   { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number     { return Math.min(this.page * this.pageSize, this.total); }
  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('produtos', true) !== false; }
  get podeExcluirModulo(): boolean { return this.auth.podeExcluirModulo('produtos'); }
  get indicadores() {
    const total = this.unidadesAll.length;
    const decimais = this.unidadesAll.filter(u => !!u.permite_decimal).length;
    return { total, inteiras: total - decimais, decimais };
  }
  get searchSuggestions(): string[] {
    const valores = this.unidadesAll.flatMap(item => [
      item.Descricao,
      item.Codigo
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.load();
  }

  // --------- Fluxo ---------
  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000, ordering: 'Descricao' }).subscribe({
      next: (res: any) => {
        const arr: Unidade[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.unidadesAll = arr;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error(err);
        this.unidadesAll = [];
        this.unidades = [];
        this.total = 0;
        this.loading = false; // <- garante que o spinner não fica infinito
        this.errorMsg = 'Falha ao carregar unidades.';
      }
    });
  }

  applyPage(): void {
    const filtered = this.unidadesFiltradas;
    this.total = filtered.length;
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.unidades = filtered.slice(start, end);
  }

  onPageSizeChange(sizeStr: string | number): void {
    const size = Number(sizeStr) || 20;
    this.pageSize = size;
    localStorage.setItem('sysvar.list.unidades.pageSize', String(this.pageSize));
    this.page = 1;
    this.applyPage();
  }
  onPageChange(page: number): void {
    this.page = Math.max(1, Math.min(page, this.totalPages));
    this.applyPage();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.applyPage(); } }
  prevPage(): void  { if (this.page > 1)  { this.page--; this.applyPage(); } }
  nextPage(): void  { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void  { if (this.page !== this.totalPages) { this.page = this.totalPages; this.applyPage(); } }

  onSearchKeyup(ev: KeyboardEvent): void { if (ev.key === 'Enter') this.doSearch(); }
  doSearch(): void { this.page = 1; this.applyPage(); }
  clearSearch(): void { this.search = ''; this.page = 1; this.applyPage(); }

  // --------- CRUD ---------
  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({ Descricao: '', Codigo: '', permite_decimal: false });
  }

  editar(row: Unidade): void {
    this.showForm = true;
    this.editingId = (row as any).Idunidade ?? null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({
      Descricao: row.Descricao ?? '',
      Codigo: row.Codigo ?? '',
      permite_decimal: !!row.permite_decimal,
    });
  }

  consultar(row: Unidade): void {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  cancelarEdicao(): void {
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.errorOverlayOpen = false;
    this.form.enable({ emitEvent: false });
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlayIfNeeded(); return; }

    const payload: Unidade = { ...this.form.value, permite_decimal: !!this.form.value.permite_decimal };
    this.saving = true;

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas com sucesso.' : 'Unidade criada com sucesso.';
        this.cancelarEdicao();
        this.page = 1;
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.successMsg = '';
        if (err?.error && typeof err.error === 'object') {
          Object.keys(err.error).forEach(field => {
            const ctrl = this.form.get(field);
            if (ctrl) {
              ctrl.setErrors({
                ...(ctrl.errors || {}),
                server: Array.isArray(err.error[field]) ? err.error[field].join(' ') : String(err.error[field]),
              });
            }
          });
        }
        this.openErrorOverlayIfNeeded();
      }
    });
  }

  excluir(item: Unidade): void {
    if (!this.podeExcluirModulo) return;
    const id = (item as any).Idunidade;
    if (!id) return;
    this.excluirModal = item;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const item = this.excluirModal;
    const id = item ? (item as any).Idunidade : null;
    if (!id) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Unidade excluída.';
        const eraUltimo = this.unidades.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      }
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  executarAcao(key: string | Event, unidade: Unidade): void {
    if (typeof key !== 'string') return;
    if (key === 'consultar') this.consultar(unidade);
    if (key === 'editar') this.editar(unidade);
    if (key === 'excluir') this.excluir(unidade);
  }

  rowActions(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '×', danger: true, dividerBefore: true, visible: this.podeExcluirModulo },
    ];
  }

  get unidadesFiltradas(): Unidade[] {
    const term = this.normalize(this.search);
    return this.unidadesAll
      .filter(u => {
        if (!term) return true;
        return this.normalize([u.Descricao, u.Codigo, u.permite_decimal ? 'decimal' : 'inteira'].join(' ')).includes(term);
      })
      .sort((a, b) => this.compareUnidades(a, b));
  }

  sortBy(key: 'descricao' | 'codigo' | 'decimal'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.applyPage();
  }

  sortIcon(key: 'descricao' | 'codigo' | 'decimal'): string {
    if (this.sortKey !== key) return '↕';
    return this.sortDir === 'asc' ? '↓' : '↑';
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
    const headers = ['Descricao', 'Codigo', 'Aceita decimal'];
    const body = this.unidadesFiltradas.map(u => [u.Descricao || '', u.Codigo || '', u.permite_decimal ? 'Sim' : 'Nao']);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'unidades.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  private compareUnidades(a: Unidade, b: Unidade): number {
    const val = (u: Unidade) => {
      if (this.sortKey === 'codigo') return u.Codigo || '';
      if (this.sortKey === 'decimal') return u.permite_decimal ? '1' : '0';
      return u.Descricao || '';
    };
    const result = String(val(a)).localeCompare(String(val(b)), 'pt-BR', { numeric: true });
    return this.sortDir === 'asc' ? result : -result;
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.unidades.pageSize'));
    if ([20, 50, 100].includes(size)) this.pageSize = size;
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

  // --------- Overlay de erros ---------
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('Descricao')?.hasError('required') || false, 'Descrição é obrigatória.');
    P(f.get('Descricao')?.hasError('maxlength') || false, 'Descrição: máx. 100 caracteres.');
    P(f.get('Codigo')?.hasError('maxlength') || false, 'Código: máx. 10 caracteres.');

    ['Descricao', 'Codigo'].forEach(field => {
      const err = f.get(field)?.errors?.['server'];
      if (err) msgs.push(`${field}: ${err}`);
    });

    return msgs;
  }

  openErrorOverlayIfNeeded(): void {
    const has = this.getFormErrors().length > 0;
    this.errorOverlayOpen = has;
  }
  closeErrorOverlay(): void { this.errorOverlayOpen = false; }
}
