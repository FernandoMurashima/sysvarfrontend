import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { GradesService } from '../../core/services/grades.service';
import { TamanhosService } from '../../core/services/tamanhos.service';
import { GradeModel } from '../../core/models/grade';
import { TamanhoModel } from '../../core/models/tamanho';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';

@Component({
  selector: 'app-grades',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent],
  templateUrl: './grades.component.html',
  styleUrls: ['./grades.component.css'],
})
export class GradesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private gradesApi = inject(GradesService);
  private tamanhosApi = inject(TamanhosService);
  private auth = inject(AuthService);
  constructor(private router: Router) {}

  goHome() { this.router.navigate(['/home']); }

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  submitted = false;
  excluirModal: { tipo: 'grade' | 'tamanho'; titulo: string; grade?: GradeModel; tamanho?: TamanhoModel } | null = null;

  grades: GradeModel[] = [];
  tamanhos: TamanhoModel[] = [];
  allTamanhos: TamanhoModel[] = [];

  search = '';
  filterStatus = '';
  advancedOpen = false;
  columnsOpen = false;
  exportOpen = false;
  selectedGrade: GradeModel | null = null;
  indicatorsVisible = true;
  filtersVisible = true;
  private readonly columnsStorageKey = 'sysvar.list.grades.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.grades';
  columns = [
    { key: 'id', label: 'ID', visible: true, required: false },
    { key: 'descricao', label: 'Descrição', visible: true, required: true },
    { key: 'status', label: 'Status', visible: true, required: false },
    { key: 'tamanhos', label: 'Tamanhos', visible: true, required: false },
  ];
  selectedGradeId: number | null = null;
  selectedTamanho: TamanhoModel | null = null;
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50];
  totalRecords = 0;
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalRecords / this.pageSize)); }
  get pageStart(): number { return this.totalRecords === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.totalRecords); }

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('produtos', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('produtos');
  }
  get searchSuggestions(): string[] {
    const valores = [
      ...this.grades.flatMap(item => [
        item.Descricao,
        item.Status
      ]),
      ...this.allTamanhos.flatMap(item => [
        item.Tamanho,
        item.Descricao,
        item.Status
      ])
    ].filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  get gradesFiltradas(): GradeModel[] {
    return this.grades;
  }

  get indicadores() {
    const total = this.totalRecords;
    const ativas = this.grades.filter(g => this.isAtiva(g.Status)).length;
    return { total, ativas, inativas: total - ativas, tamanhos: this.allTamanhos.length };
  }

  get selectedGradeDetalhe(): GradeModel | null {
    return this.grades.find(g => g.Idgrade === this.selectedGradeId) ?? this.selectedGrade;
  }

  formModeGrade: 'new' | 'edit' | null = null;
  editingGradeId: number | null = null;
  consultandoGrade = false;

  formGrade = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Status: ['ATIVO'],
  });

  editingTamId: number | null = null;
  consultandoTamanho = false;
  submittedSub = false;

  formTamanho = this.fb.group({
    Idgrade: [0, [Validators.required]],
    Tamanho: ['', [Validators.required, Validators.maxLength(10)]],
    Descricao: ['Tamanho', [Validators.required, Validators.maxLength(100)]],
    Status: ['ATIVO'],
  });

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.loadGrades();
  }

  // ===== GRADES =====
  loadGrades() {
    this.loading = true; this.errorMsg = '';
    // <- sem 'search', o service só aceita { ordering?: string }
    this.gradesApi.list({ search: this.search || undefined, Status: this.filterStatus || undefined, page: this.page, page_size: this.pageSize, ordering: 'Descricao' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.grades = Array.isArray(rows) ? rows : [];
        this.totalRecords = Array.isArray(payload) ? this.grades.length : (payload?.count ?? this.grades.length);
        this.carregarTodosTamanhos();
      },
      error: () => { this.errorMsg = 'Falha ao carregar grades.'; },
      complete: () => { this.loading = false; }
    });
  }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  doSearch() { this.page = 1; this.errorMsg = ''; this.loadGrades(); }
  clearSearch() { this.search = ''; this.filterStatus = ''; this.page = 1; this.loadGrades(); }
  onPageSizeChange(v: number) { this.pageSize = +v; this.page = 1; this.loadGrades(); }
  firstPage() { this.page = 1; this.loadGrades(); }
  prevPage() { this.page = Math.max(1, this.page - 1); this.loadGrades(); }
  nextPage() { this.page = Math.min(this.totalPages, this.page + 1); this.loadGrades(); }
  lastPage() { this.page = this.totalPages; this.loadGrades(); }

  selecionarGradeLinha(g: GradeModel): void { this.selectedGrade = this.isSelectedGrade(g) ? null : g; }
  isSelectedGrade(g: GradeModel): boolean { return !!this.selectedGrade && this.selectedGrade.Idgrade === g.Idgrade; }
  consultarGradeSelecionada(): void { if (this.selectedGrade) this.consultarGrade(this.selectedGrade); }
  editarGradeSelecionada(): void { if (this.selectedGrade && this.podeEditarModulo) this.editarGrade(this.selectedGrade); }
  abrirTamanhosSelecionado(): void { if (this.selectedGrade?.Idgrade) this.selecionarGrade(this.selectedGrade.Idgrade); }
  excluirGradeSelecionada(): void { if (this.selectedGrade && this.podeExcluirModulo) this.excluirGrade(this.selectedGrade); }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  restoreViewPreference(): void {
    localStorage.removeItem(this.viewPrefsKey);
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.columns = this.columns.map(c => ({ ...c, visible: true }));
    this.saveColumnsPreference();
  }
  @HostListener('window:sysvar-grades-toggle-indicators')
  onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-grades-toggle-filters')
  onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-grades-restore-view')
  onRestoreViewEvent(): void { this.restoreViewPreference(); }

  novoGrade() {
    this.editingGradeId = null;
    this.consultandoGrade = false;
    this.formModeGrade = 'new';
    this.submitted = false;
    this.formGrade.enable({ emitEvent: false });
    this.formGrade.reset({ Descricao: '', Status: 'ATIVO' });
    this.successMsg = ''; this.errorMsg = '';
  }

  editarGrade(g: GradeModel) {
    this.editingGradeId = g.Idgrade ?? null;
    this.consultandoGrade = false;
    this.formModeGrade = 'edit';
    this.submitted = false;
    this.formGrade.enable({ emitEvent: false });
    this.formGrade.reset({ Descricao: g.Descricao ?? '', Status: g.Status ?? '' });
    this.successMsg = ''; this.errorMsg = '';
  }

  consultarGrade(g: GradeModel) {
    this.editarGrade(g);
    this.consultandoGrade = true;
    this.formGrade.disable({ emitEvent: false });
  }

  salvarGrade() {
    this.submitted = true;
    if (this.formGrade.invalid) { this.errorMsg = 'Revise os campos destacados.'; return; }
    this.saving = true; this.errorMsg = ''; this.successMsg = '';

    const raw = this.formGrade.getRawValue();
    const payload = {
      Descricao: String(raw.Descricao ?? '').trim(),
      Status: (raw.Status ?? 'ATIVO') || 'ATIVO',
    };

    const isEdit = !!this.editingGradeId;
    const req$ = isEdit
      ? this.gradesApi.update(this.editingGradeId!, payload)
      : this.gradesApi.create(payload);

    req$.subscribe({
      next: (g) => {
        this.successMsg = isEdit ? 'Grade atualizada.' : 'Grade criada.';
        this.loadGrades();
        this.cancelarEdicaoGrade();
        if (!isEdit && (g as any)?.Idgrade) this.selecionarGrade((g as any).Idgrade);
      },
      error: (err: HttpErrorResponse) => {
        const detail = (err?.error?.detail || err?.error?.error || err?.error) ?? '';
        this.errorMsg = (typeof detail === 'string' && detail) ? detail : 'Falha ao salvar a grade.';
      },
      complete: () => (this.saving = false),
    });
  }

  excluirGrade(g: GradeModel) {
    if (!this.podeExcluirModulo) return;
    if (!g.Idgrade) return;
    this.excluirModal = { tipo: 'grade', titulo: `Excluir a grade "${g.Descricao}"?`, grade: g };
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const modal = this.excluirModal;
    if (!modal) return;
    if (modal.tipo === 'grade' && modal.grade) {
      this.executarExclusaoGrade(modal.grade);
      return;
    }
    if (modal.tipo === 'tamanho' && modal.tamanho) {
      this.executarExclusaoTamanho(modal.tamanho);
    }
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  private executarExclusaoGrade(g: GradeModel): void {
    this.gradesApi.remove(g.Idgrade!).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Grade excluída.';
        if (this.selectedGradeId === g.Idgrade) this.fecharTamanhos();
        this.loadGrades();
        if (this.editingGradeId === g.Idgrade) this.novoGrade();
      },
      error: () => this.errorMsg = 'Falha ao excluir a grade.'
    });
  }

  cancelarEdicaoGrade() {
    this.editingGradeId = null;
    this.consultandoGrade = false;
    this.formModeGrade = null;
    this.submitted = false;
    this.formGrade.enable({ emitEvent: false });
    this.formGrade.reset({ Descricao: '', Status: 'ATIVO' });
  }

  fieldInvalidGrade(name: string) {
    const c = this.formGrade.get(name);
    return (c?.touched || this.submitted) && c?.invalid;
  }
  getGradeErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidGrade('Descricao')) msgs.push('Informe a Descrição (máx. 100).');
    return msgs;
  }

  // ===== TAMANHOS =====
  carregarTodosTamanhos() {
    this.tamanhosApi.list({ ordering: 'Tamanho' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.allTamanhos = Array.isArray(rows) ? rows : [];
      },
      error: () => this.allTamanhos = []
    });
  }

  selecionarGrade(id: number) {
    this.selectedGradeId = id;
    this.selectedTamanho = null;
    this.carregarTamanhos(id);
    this.novoTamanho();
  }
  fecharTamanhos() {
    this.selectedGradeId = null;
    this.selectedTamanho = null;
    this.tamanhos = [];
    this.novoTamanho();
  }
  carregarTamanhos(idgrade: number) {
    this.tamanhosApi.list({ idgrade, ordering: 'Tamanho' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.tamanhos = Array.isArray(rows) ? rows : [];
        if (this.selectedTamanho && !this.tamanhos.some(t => t.Idtamanho === this.selectedTamanho?.Idtamanho)) {
          this.selectedTamanho = null;
        }
      },
      error: () => this.errorMsg = 'Falha ao carregar tamanhos.'
    });
  }

  novoTamanho() {
    this.editingTamId = null;
    this.consultandoTamanho = false;
    this.submittedSub = false;
    this.formTamanho.enable({ emitEvent: false });
    this.formTamanho.reset({
      Idgrade: this.selectedGradeId ?? 0,
      Tamanho: '',
      Descricao: 'Tamanho',
      Status: 'ATIVO'
    });
  }

  editarTamanho(t: TamanhoModel) {
    this.editingTamId = t.Idtamanho ?? null;
    this.consultandoTamanho = false;
    this.submittedSub = false;
    this.formTamanho.enable({ emitEvent: false });
    this.formTamanho.reset({
      Idgrade: (t as any).idgrade?.Idgrade ?? (t as any).idgrade ?? this.selectedGradeId ?? 0,
      Tamanho: t.Tamanho ?? '',
      Descricao: t.Descricao ?? 'Tamanho',
      Status: t.Status ?? ''
    });
  }

  selecionarTamanhoLinha(t: TamanhoModel): void {
    this.selectedTamanho = this.isSelectedTamanho(t) ? null : t;
  }

  isSelectedTamanho(t: TamanhoModel): boolean {
    return !!this.selectedTamanho && this.selectedTamanho.Idtamanho === t.Idtamanho;
  }

  consultarTamanhoSelecionado(): void { if (this.selectedTamanho) this.consultarTamanho(this.selectedTamanho); }
  editarTamanhoSelecionado(): void { if (this.selectedTamanho && this.podeEditarModulo) this.editarTamanho(this.selectedTamanho); }
  excluirTamanhoSelecionado(): void { if (this.selectedTamanho && this.podeExcluirModulo) this.excluirTamanho(this.selectedTamanho); }

  consultarTamanho(t: TamanhoModel) {
    this.editarTamanho(t);
    this.consultandoTamanho = true;
    this.formTamanho.disable({ emitEvent: false });
  }

  salvarTamanho() {
    this.submittedSub = true;
    if (this.formTamanho.invalid) return;

    const raw = this.formTamanho.getRawValue();
    const payload = {
      idgrade: Number(raw.Idgrade),
      Tamanho: String(raw.Tamanho ?? '').trim(),
      Descricao: String(raw.Descricao ?? '').trim() || 'Tamanho',
      Status: (raw.Status ?? 'ATIVO') || 'ATIVO'
    };

    const req$ = this.editingTamId
      ? this.tamanhosApi.update(this.editingTamId, payload)
      : this.tamanhosApi.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingTamId ? 'Tamanho atualizado.' : 'Tamanho criado.';
        if (this.selectedGradeId) this.carregarTamanhos(this.selectedGradeId);
        this.carregarTodosTamanhos();
        this.novoTamanho();
      },
      error: () => this.errorMsg = 'Falha ao salvar o tamanho.'
    });
  }

  excluirTamanho(t: TamanhoModel) {
    if (!this.podeExcluirModulo) return;
    if (!t.Idtamanho) return;
    this.excluirModal = { tipo: 'tamanho', titulo: `Excluir o tamanho "${t.Tamanho}"?`, tamanho: t };
  }

  private executarExclusaoTamanho(t: TamanhoModel): void {
    this.tamanhosApi.remove(t.Idtamanho!).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Tamanho excluído.';
        this.selectedTamanho = null;
        if (this.selectedGradeId) this.carregarTamanhos(this.selectedGradeId);
        this.carregarTodosTamanhos();
      },
      error: () => this.errorMsg = 'Falha ao excluir o tamanho.'
    });
  }

  cancelarEdicaoTamanho() { this.novoTamanho(); }

  fieldInvalidTamanho(name: string) {
    const c = this.formTamanho.get(name);
    return (c?.touched || this.submittedSub) && c?.invalid;
  }
  getTamanhoErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidTamanho('Idgrade')) msgs.push('Selecione a Grade.');
    if (this.fieldInvalidTamanho('Tamanho')) msgs.push('Informe o código do Tamanho (máx. 10).');
    if (this.fieldInvalidTamanho('Descricao')) msgs.push('Informe a Descrição (máx. 100).');
    return msgs;
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

  rowActionsGrade(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'tamanhos', label: 'Tamanhos', icon: '▦' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcaoGrade(action: string, g: GradeModel): void {
    if (action === 'consultar') this.consultarGrade(g);
    if (action === 'tamanhos' && g.Idgrade) this.selecionarGrade(g.Idgrade);
    if (action === 'editar') this.editarGrade(g);
    if (action === 'excluir') this.excluirGrade(g);
  }

  tamanhoCount(grade: GradeModel): number {
    if (!grade.Idgrade) return 0;
    return this.allTamanhos.filter(t => Number((t as any).idgrade?.Idgrade ?? (t as any).idgrade) === grade.Idgrade).length;
  }

  statusLabel(status: any): string {
    return this.isAtiva(status) ? 'Ativo' : 'Inativo';
  }

  exportarCsv(): void {
    const headers = ['ID', 'Descrição', 'Status'];
    const rows = this.grades.map(g => [
      String(g.Idgrade ?? ''),
      g.Descricao ?? '',
      this.statusLabel(g.Status)
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grades.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  isAtiva(status: any): boolean {
    return this.normalize(status) === 'ativa' || this.normalize(status) === 'ativo' || status === true;
  }

  private normalize(value: any): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private loadColumnsPreference(): void {
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


