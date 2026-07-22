import { Component, OnInit, inject } from '@angular/core';
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
  private readonly columnsStorageKey = 'sysvar.list.grades.columns';
  columns = [
    { key: 'id', label: 'ID', visible: true, required: false },
    { key: 'descricao', label: 'Descrição', visible: true, required: true },
    { key: 'status', label: 'Status', visible: true, required: false },
    { key: 'tamanhos', label: 'Tamanhos', visible: true, required: false },
  ];
  selectedGradeId: number | null = null;

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
    const termo = this.normalize(this.search);
    return this.grades.filter(g => {
      const matchesSearch = !termo || [
        g.Idgrade,
        g.Descricao,
        g.Status
      ].some(v => this.normalize(v).includes(termo));
      const ativo = this.isAtiva(g.Status);
      const matchesStatus =
        !this.filterStatus ||
        (this.filterStatus === 'ATIVA' && ativo) ||
        (this.filterStatus === 'INATIVA' && !ativo);
      return matchesSearch && matchesStatus;
    });
  }

  formModeGrade: 'new' | 'edit' | null = null;
  editingGradeId: number | null = null;
  consultandoGrade = false;

  formGrade = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Status: [''],
  });

  editingTamId: number | null = null;
  consultandoTamanho = false;
  submittedSub = false;

  formTamanho = this.fb.group({
    Idgrade: [0, [Validators.required]],
    Tamanho: ['', [Validators.required, Validators.maxLength(10)]],
    Descricao: ['Tamanho', [Validators.required, Validators.maxLength(100)]],
    Status: [''],
  });

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadGrades();
  }

  // ===== GRADES =====
  loadGrades() {
    this.loading = true; this.errorMsg = '';
    // <- sem 'search', o service só aceita { ordering?: string }
    this.gradesApi.list({ ordering: 'Descricao' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.grades = Array.isArray(rows) ? rows : [];
        this.carregarTodosTamanhos();
      },
      error: () => { this.errorMsg = 'Falha ao carregar grades.'; },
      complete: () => { this.loading = false; }
    });
  }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  doSearch() {
    this.errorMsg = '';
  }
  clearSearch() { this.search = ''; this.filterStatus = ''; }

  novoGrade() {
    this.editingGradeId = null;
    this.consultandoGrade = false;
    this.formModeGrade = 'new';
    this.submitted = false;
    this.formGrade.enable({ emitEvent: false });
    this.formGrade.reset({ Descricao: '', Status: '' });
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
      Status: (raw.Status ?? '') || null,
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
    this.formGrade.reset({ Descricao: '', Status: '' });
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
    this.carregarTamanhos(id);
    this.novoTamanho();
  }
  fecharTamanhos() {
    this.selectedGradeId = null;
    this.tamanhos = [];
    this.novoTamanho();
  }
  carregarTamanhos(idgrade: number) {
    this.tamanhosApi.list({ idgrade, ordering: 'Tamanho' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.tamanhos = Array.isArray(rows) ? rows : [];
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
      Status: ''
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
      Status: (raw.Status ?? '') || null
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

  rowActionsTamanho(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcaoTamanho(action: string, t: TamanhoModel): void {
    if (action === 'consultar') this.consultarTamanho(t);
    if (action === 'editar') this.editarTamanho(t);
    if (action === 'excluir') this.excluirTamanho(t);
  }

  tamanhoCount(grade: GradeModel): number {
    if (!grade.Idgrade) return 0;
    return this.allTamanhos.filter(t => Number((t as any).idgrade?.Idgrade ?? (t as any).idgrade) === grade.Idgrade).length;
  }

  statusLabel(status: any): string {
    return status || '—';
  }

  exportarCsv(): void {
    const headers = ['ID', 'Descrição', 'Status'];
    const rows = this.gradesFiltradas.map(g => [
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
}
