import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CoresService } from '../../core/services/cores.service';
import { Cor } from '../../core/models/cor';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';

@Component({
  selector: 'app-cores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent],
  templateUrl: './cores.component.html',
  styleUrls: ['./cores.component.css']
})
export class CoresComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CoresService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;
  consultando = false;

  search = '';
  filterStatus = '';
  advancedOpen = false;
  columnsOpen = false;
  exportOpen = false;
  selectedCor: Cor | null = null;
  indicatorsVisible = true;
  filtersVisible = true;
  private readonly columnsStorageKey = 'sysvar.list.cores.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.cores';
  columns = [
    { key: 'descricao', label: 'Descrição', visible: true, required: true },
    { key: 'codigo', label: 'Código', visible: true, required: false },
    { key: 'cor', label: 'Nome da cor', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];
  successMsg = '';
  errorMsg = '';
  excluirModal: Cor | null = null;
  errorOverlayOpen = false;

  form: FormGroup = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: ['', [Validators.maxLength(12)]],
    Cor: ['', [Validators.required, Validators.maxLength(30)]],
    Status: ['']
  });

  coresAll: Cor[] = [];
  cores: Cor[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('produtos', true) !== false;
  }
  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('produtos');
  }
  total = 0;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }
  get pageStart(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }
  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }
  get searchSuggestions(): string[] {
    const valores = this.coresAll.flatMap(item => [
      item.Descricao,
      item.Codigo,
      item.Cor,
      item.Status
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  get coresFiltradas(): Cor[] {
    const termo = this.normalize(this.search);
    return this.coresAll.filter(item => {
      const matchesSearch = !termo || [
        item.Descricao,
        item.Codigo,
        item.Cor,
        item.Status
      ].some(v => this.normalize(v).includes(termo));
      const ativo = this.isAtivo(item);
      const matchesStatus =
        !this.filterStatus ||
        (this.filterStatus === 'ATIVO' && ativo) ||
        (this.filterStatus === 'INATIVO' && !ativo);
      return matchesSearch && matchesStatus;
    });
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.load();
  }

  // --------- Fluxo ---------
  load(): void {
    this.loading = true;
    this.api.list({ search: this.search || undefined, Status: this.filterStatus || undefined, page: this.page, page_size: this.pageSize, ordering: 'Descricao' }).subscribe({
      next: (res: any) => {
        const arr: Cor[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.coresAll = arr;
        this.cores = arr;
        this.total = Array.isArray(res) ? arr.length : (res?.count ?? arr.length);
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error(err);
        this.coresAll = [];
        this.cores = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar cores.';
      }
    });
  }

  applyPage(): void {
    this.cores = this.coresAll;
    if (this.selectedCor && !this.cores.some(c => this.corId(c) === this.corId(this.selectedCor))) this.selectedCor = null;
  }

  onPageSizeChange(sizeStr: string): void {
    const size = Number(sizeStr) || 10;
    this.pageSize = size;
    this.page = 1;
    this.load();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.load(); } }
  prevPage(): void  { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void  { if (this.page < this.totalPages) { this.page++; this.load(); } }
  lastPage(): void  { if (this.page !== this.totalPages) { this.page = this.totalPages; this.load(); } }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }
  doSearch(): void {
    this.page = 1;
    this.load();
  }
  clearSearch(): void {
    this.search = '';
    this.filterStatus = '';
    this.page = 1;
    this.load();
  }

  get indicadores() {
    const total = this.total;
    const ativas = this.coresAll.filter(c => this.isAtivo(c)).length;
    return { total, ativas, inativas: total - ativas, codigos: this.coresAll.filter(c => !!c.Codigo).length, nomes: this.coresAll.filter(c => !!c.Cor).length };
  }

  corId(c: Cor | null): number | null {
    return c ? ((c as any).Idcor ?? null) : null;
  }

  selecionarCor(c: Cor): void {
    this.selectedCor = this.isSelected(c) ? null : c;
  }

  isSelected(c: Cor): boolean {
    return !!this.selectedCor && this.corId(this.selectedCor) === this.corId(c);
  }

  consultarSelecionado(): void { if (this.selectedCor) this.consultar(this.selectedCor); }
  editarSelecionado(): void { if (this.selectedCor && this.podeEditarModulo) this.editar(this.selectedCor); }
  excluirSelecionado(): void { if (this.selectedCor && this.podeExcluirModulo) this.excluir(this.selectedCor); }

  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  restoreViewPreference(): void {
    localStorage.removeItem(this.viewPrefsKey);
    localStorage.removeItem('sysvar.list.cores.pageSize');
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.pageSize = 20;
    this.columns = this.columns.map(c => ({ ...c, visible: true }));
    this.saveColumnsPreference();
    this.load();
  }

  @HostListener('window:sysvar-cores-toggle-indicators')
  onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-cores-toggle-filters')
  onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-cores-restore-view')
  onRestoreViewEvent(): void { this.restoreViewPreference(); }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });

    this.form.reset({
      Descricao: '',
      Codigo: '',
      Cor: '',
      Status: 'ATIVO'
    });
  }

  editar(row: Cor): void {
    this.showForm = true;
    this.editingId = (row as any).Idcor ?? null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });

    this.form.reset({
      Descricao:    row.Descricao ?? '',
      Codigo:       row.Codigo ?? '',
      Cor:          row.Cor ?? '',
      Status:       row.Status ?? ''
    });
  }

  consultar(row: Cor): void {
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
    if (this.form.invalid) {
      this.openErrorOverlayIfNeeded();
      return;
    }

    const payload: Cor = { ...this.form.value };
    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId
          ? 'Alterações salvas com sucesso.'
          : 'Cor criada com sucesso.';
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
                server: Array.isArray(err.error[field]) ? err.error[field].join(' ') : String(err.error[field])
              });
            }
          });
        }
        this.openErrorOverlayIfNeeded();
      }
    });
  }

  excluir(item: Cor): void {
    if (!this.podeExcluirModulo) return;
    const id = (item as any).Idcor;
    if (!id) return;
    this.excluirModal = item;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const item = this.excluirModal;
    const id = item ? (item as any).Idcor : null;
    if (!id) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Cor excluída.';
        const eraUltimo = this.cores.length === 1 && this.page > 1;
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

  // --------- Overlay de erros ---------
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('Descricao')?.hasError('required') || false, 'Descrição é obrigatória.');
    P(f.get('Descricao')?.hasError('maxlength') || false, 'Descrição: máx. 100 caracteres.');
    P(f.get('Cor')?.hasError('required') || false, 'Nome da cor é obrigatório.');
    P(f.get('Cor')?.hasError('maxlength') || false, 'Cor: máx. 30 caracteres.');
    P(f.get('Codigo')?.hasError('maxlength') || false, 'Código: máx. 12 caracteres.');

    ['Descricao','Codigo','Cor','Status'].forEach(field => {
      const err = f.get(field)?.errors?.['server'];
      if (err) msgs.push(`${field}: ${err}`);
    });

    return msgs;
  }

  openErrorOverlayIfNeeded(): void {
    const has = this.getFormErrors().length > 0;
    this.errorOverlayOpen = has;
  }
  closeErrorOverlay(): void {
    this.errorOverlayOpen = false;
  }

  visibleColumn(key: string): boolean {
    return this.columns.find(c => c.key === key)?.visible !== false;
  }

  toggleColumn(key: string, visible: boolean): void {
    const col = this.columns.find(c => c.key === key);
    if (!col || col.required) return;
    col.visible = visible;
    this.saveColumnsPreference();
  }

  rowActions(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string, item: Cor): void {
    if (action === 'consultar') this.consultar(item);
    if (action === 'editar') this.editar(item);
    if (action === 'excluir') this.excluir(item);
  }

  statusLabel(item: Cor): string {
    return this.isAtivo(item) ? 'Ativo' : 'Inativo';
  }

  exportarCsv(): void {
    const headers = ['Descrição', 'Código', 'Nome da cor', 'Status'];
    const rows = this.cores.map(item => [
      item.Descricao ?? '',
      item.Codigo ?? '',
      item.Cor ?? '',
      this.statusLabel(item)
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cores.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  isAtivo(item: Cor): boolean {
    const status = (item as any).Status;
    return status === true || status === 'true' || status === 'Ativo' || status === 'ATIVO' || status === '1' || status === 'A';
  }

  private normalize(value: any): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.cores.pageSize'));
    if ([10, 20, 50, 100].includes(size)) this.pageSize = size;
    try {
      const raw = localStorage.getItem(this.columnsStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, boolean>;
      this.columns = this.columns.map(col => col.required ? col : { ...col, visible: saved[col.key] ?? col.visible });
    } catch {}
  }

  private saveColumnsPreference(): void {
    const state = Object.fromEntries(this.columns.map(col => [col.key, col.visible]));
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


