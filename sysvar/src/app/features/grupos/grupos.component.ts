import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {Router} from '@angular/router';
import { GruposService } from '../../core/services/grupos.service';
import { SubgruposService } from '../../core/services/subgrupos.service';
import { GrupoModel } from '../../core/models/grupo';
import { SubgrupoModel } from '../../core/models/subgrupo';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';

@Component({
  selector: 'app-grupos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent, SummaryCardComponent],
  templateUrl: './grupos.component.html',
  styleUrls: ['./grupos.component.css']
})
export class GruposComponent implements OnInit {
  private fb = inject(FormBuilder);
  private gruposApi = inject(GruposService);
  private subgruposApi = inject(SubgruposService);
  private auth = inject(AuthService);
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/home']);
  }

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  submitted = false;
  excluirModal: { tipo: 'grupo' | 'subgrupo'; titulo: string; grupo?: GrupoModel; subgrupo?: SubgrupoModel } | null = null;

  grupos: GrupoModel[] = [];
  subgrupos: SubgrupoModel[] = [];
  allSubgrupos: SubgrupoModel[] = [];

  search = '';
  filterMargem = '';
  advancedOpen = false;
  columnsOpen = false;
  exportOpen = false;
  private readonly columnsStorageKey = 'sysvar.list.grupos.columns';
  columns = [
    { key: 'codigo', label: 'Codigo', visible: true, required: true },
    { key: 'descricao', label: 'Descricao', visible: true, required: true },
    { key: 'margem', label: 'Margem', visible: true, required: false },
    { key: 'subgrupos', label: 'Subgrupos', visible: true, required: false },
  ];

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('produtos', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('produtos');
  }
  get searchSuggestions(): string[] {
    const valores = [
      ...this.grupos.flatMap(item => [
        item.Codigo,
        item.Descricao,
        String(item.Margem ?? '')
      ]),
      ...this.allSubgrupos.flatMap(item => [
        item.Descricao,
        String(item.Margem ?? '')
      ])
    ].filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  get gruposFiltrados(): GrupoModel[] {
    const termo = this.normalize(this.search);
    return this.grupos.filter(g => {
      const matchesSearch = !termo || [
        g.Codigo,
        g.Descricao,
        String(g.Margem ?? '')
      ].some(v => this.normalize(v).includes(termo));
      const margem = Number(g.Margem ?? 0);
      const matchesMargem =
        !this.filterMargem ||
        (this.filterMargem === 'sem' && margem === 0) ||
        (this.filterMargem === 'com' && margem > 0);
      return matchesSearch && matchesMargem;
    });
  }

  get indicadores() {
    const total = this.grupos.length;
    const comMargem = this.grupos.filter(g => Number(g.Margem ?? 0) > 0).length;
    return {
      total,
      comMargem,
      semMargem: total - comMargem,
      subgrupos: this.allSubgrupos.length
    };
  }

  percentual(valor: number): string {
    const total = this.grupos.length || 0;
    if (!total) return '0% do total';
    return `${Math.round((valor / total) * 100)}% do total`;
  }

  editingGrupoId: number | null = null;
  consultandoGrupo = false;
  /** novo: controla abertura/fechamento do form de Grupo */
  formModeGrupo: 'new' | 'edit' | null = null;

  selectedGrupoId: number | null = null;

  // Form Grupo
  formGrupo = this.fb.group({
    Codigo: ['', [Validators.required, Validators.maxLength(12)]],
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Margem: [0, [Validators.required, Validators.min(0)]],
  });

  // Form Subgrupo
  editingSubgrupoId: number | null = null;
  consultandoSubgrupo = false;
  submittedSub = false;

  formSubgrupo = this.fb.group({
    Idgrupo: [0, [Validators.required]],
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Margem: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadGrupos();
  }

  // ===== GRUPOS =====
  loadGrupos() {
    this.loading = true;
    this.errorMsg = '';
    this.gruposApi.list({ ordering: '-data_cadastro', page_size: 2000 }).subscribe({
      next: (data) => {
        this.grupos = Array.isArray(data) ? data : (data as any).results ?? [];
        this.carregarTodosSubgrupos();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao carregar grupos.';
      },
      complete: () => this.loading = false
    });
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.loadGrupos(); }
  doSearch() { this.errorMsg = ''; }
  clearSearch() { this.search = ''; this.filterMargem = ''; this.doSearch(); }

  novoGrupo() {
    this.editingGrupoId = null;
    this.consultandoGrupo = false;
    this.formModeGrupo = 'new';      // <- abre o form
    this.submitted = false;
    this.formGrupo.enable({ emitEvent: false });
    this.formGrupo.reset({ Codigo: '', Descricao: '', Margem: 0 });
    this.successMsg = '';
    this.errorMsg = '';
  }

  editarGrupo(g: GrupoModel) {
    this.editingGrupoId = g.Idgrupo ?? null;
    this.consultandoGrupo = false;
    this.formModeGrupo = 'edit';     // <- abre o form
    this.submitted = false;
    this.formGrupo.enable({ emitEvent: false });
    this.formGrupo.reset({
      Codigo: g.Codigo ?? '',
      Descricao: g.Descricao ?? '',
      Margem: g.Margem ?? 0,
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  consultarGrupo(g: GrupoModel) {
    this.editarGrupo(g);
    this.consultandoGrupo = true;
    this.formGrupo.disable({ emitEvent: false });
  }

  salvarGrupo() {
    this.submitted = true;
    if (this.formGrupo.invalid) {
      this.errorMsg = 'Revise os campos destacados e tente novamente.';
      return;
    }
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    const raw = this.formGrupo.getRawValue();
    const payload: Omit<GrupoModel, 'Idgrupo' | 'data_cadastro'> = {
      Codigo: String(raw.Codigo ?? '').trim(),
      Descricao: String(raw.Descricao ?? '').trim(),
      Margem: Number(raw.Margem ?? 0),
    };

    const isEdit = !!this.editingGrupoId;
    const req$ = isEdit
      ? this.gruposApi.update(this.editingGrupoId!, payload)
      : this.gruposApi.create(payload);

    req$.subscribe({
      next: (g) => {
        this.successMsg = isEdit ? 'Grupo atualizado.' : 'Grupo criado.';
        this.loadGrupos();
        this.cancelarEdicaoGrupo();   // <- fecha o form
        if (!isEdit && g?.Idgrupo) this.selecionarGrupo(g.Idgrupo);
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        const detail = (err?.error?.detail || err?.error?.error || err?.error) ?? '';
        this.errorMsg = (typeof detail === 'string' && detail) ? detail : 'Falha ao salvar o grupo.';
      },
      complete: () => this.saving = false
    });
  }

  excluirGrupo(g: GrupoModel) {
    if (!this.podeExcluirModulo) return;
    if (!g.Idgrupo) return;
    this.excluirModal = { tipo: 'grupo', titulo: `Excluir o grupo "${g.Descricao}"?`, grupo: g };
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const modal = this.excluirModal;
    if (!modal) return;
    if (modal.tipo === 'grupo' && modal.grupo) {
      this.executarExclusaoGrupo(modal.grupo);
      return;
    }
    if (modal.tipo === 'subgrupo' && modal.subgrupo) {
      this.executarExclusaoSubgrupo(modal.subgrupo);
    }
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  private executarExclusaoGrupo(g: GrupoModel): void {
    this.gruposApi.remove(g.Idgrupo!).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Grupo excluído.';
        this.loadGrupos();
        if (this.editingGrupoId === g.Idgrupo) this.novoGrupo();
        if (this.selectedGrupoId === g.Idgrupo) this.fecharSubgrupos();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir o grupo.';
      }
    });
  }

  cancelarEdicaoGrupo() {
    this.editingGrupoId = null;
    this.consultandoGrupo = false;
    this.formModeGrupo = null;       // <- esconde o form
    this.submitted = false;
    this.formGrupo.enable({ emitEvent: false });
    this.formGrupo.reset({ Codigo: '', Descricao: '', Margem: 0 });
  }

  fieldInvalidGrupo(name: string) {
    const c = this.formGrupo.get(name);
    return (c?.touched || this.submitted) && c?.invalid;
  }

  getGrupoErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidGrupo('Codigo')) msgs.push('Informe o Código (máx. 12).');
    if (this.fieldInvalidGrupo('Descricao')) msgs.push('Informe a Descrição (máx. 100).');
    if (this.fieldInvalidGrupo('Margem')) msgs.push('Informe a Margem (>= 0).');
    return msgs;
  }

  // ===== SUBGRUPOS =====
  carregarTodosSubgrupos() {
    this.subgruposApi.list({ ordering: 'Descricao' }).subscribe({
      next: (data) => {
        this.allSubgrupos = Array.isArray(data) ? data : (data as any).results ?? [];
      },
      error: (err) => {
        console.error(err);
        this.allSubgrupos = [];
      }
    });
  }

  selecionarGrupo(id: number) {
    this.selectedGrupoId = id;
    this.carregarSubgrupos(id);
    this.novoSubgrupo();
  }

  fecharSubgrupos() {
    this.selectedGrupoId = null;
    this.subgrupos = [];
    this.novoSubgrupo();
  }

  carregarSubgrupos(Idgrupo: number) {
    this.subgruposApi.list({ Idgrupo, ordering: 'Descricao' }).subscribe({
      next: (data) => {
        this.subgrupos = Array.isArray(data) ? data : (data as any).results ?? [];
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao carregar subgrupos.';
      }
    });
  }

  novoSubgrupo() {
    this.editingSubgrupoId = null;
    this.consultandoSubgrupo = false;
    this.submittedSub = false;
    this.formSubgrupo.enable({ emitEvent: false });
    this.formSubgrupo.reset({
      Idgrupo: this.selectedGrupoId ?? 0,
      Descricao: '',
      Margem: 0,
    });
  }

  editarSubgrupo(s: SubgrupoModel) {
    this.editingSubgrupoId = s.Idsubgrupo ?? null;
    this.consultandoSubgrupo = false;
    this.submittedSub = false;
    this.formSubgrupo.enable({ emitEvent: false });
    this.formSubgrupo.reset({
      Idgrupo: (s as any).Idgrupo?.Idgrupo ?? (s as any).Idgrupo ?? this.selectedGrupoId ?? 0,
      Descricao: s.Descricao ?? '',
      Margem: s.Margem ?? 0,
    });
  }

  consultarSubgrupo(s: SubgrupoModel) {
    this.editarSubgrupo(s);
    this.consultandoSubgrupo = true;
    this.formSubgrupo.disable({ emitEvent: false });
  }

  salvarSubgrupo() {
    this.submittedSub = true;
    if (this.formSubgrupo.invalid) return;

    const raw = this.formSubgrupo.getRawValue();
    const payload: Omit<SubgrupoModel, 'Idsubgrupo' | 'data_cadastro'> = {
      Idgrupo: Number(raw.Idgrupo),
      Descricao: String(raw.Descricao ?? '').trim(),
      Margem: Number(raw.Margem ?? 0),
    };

    const req$ = this.editingSubgrupoId
      ? this.subgruposApi.update(this.editingSubgrupoId, payload)
      : this.subgruposApi.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingSubgrupoId ? 'Subgrupo atualizado.' : 'Subgrupo criado.';
        if (this.selectedGrupoId) this.carregarSubgrupos(this.selectedGrupoId);
        this.carregarTodosSubgrupos();
        this.novoSubgrupo();
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.errorMsg = 'Falha ao salvar o subgrupo.';
      }
    });
  }

  excluirSubgrupo(s: SubgrupoModel) {
    if (!this.podeExcluirModulo) return;
    if (!s.Idsubgrupo) return;
    this.excluirModal = { tipo: 'subgrupo', titulo: `Excluir o subgrupo "${s.Descricao}"?`, subgrupo: s };
  }

  private executarExclusaoSubgrupo(s: SubgrupoModel): void {
    this.subgruposApi.remove(s.Idsubgrupo!).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Subgrupo excluído.';
        if (this.selectedGrupoId) this.carregarSubgrupos(this.selectedGrupoId);
        this.carregarTodosSubgrupos();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir o subgrupo.';
      }
    });
  }

  cancelarEdicaoSubgrupo() { this.novoSubgrupo(); }

  fieldInvalidSubgrupo(name: string) {
    const c = this.formSubgrupo.get(name);
    return (c?.touched || this.submittedSub) && c?.invalid;
  }

  getSubgrupoErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidSubgrupo('Idgrupo')) msgs.push('Selecione um Grupo.');
    if (this.fieldInvalidSubgrupo('Descricao')) msgs.push('Informe a Descrição (máx. 100).');
    if (this.fieldInvalidSubgrupo('Margem')) msgs.push('Informe a Margem (>= 0).');
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

  rowActionsGrupo(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'subgrupos', label: 'Subgrupos', icon: '▦' },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcaoGrupo(action: string, g: GrupoModel): void {
    if (action === 'consultar') this.consultarGrupo(g);
    if (action === 'editar') this.editarGrupo(g);
    if (action === 'subgrupos' && g.Idgrupo) this.selecionarGrupo(g.Idgrupo);
    if (action === 'excluir') this.excluirGrupo(g);
  }

  rowActionsSubgrupo(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcaoSubgrupo(action: string, s: SubgrupoModel): void {
    if (action === 'consultar') this.consultarSubgrupo(s);
    if (action === 'editar') this.editarSubgrupo(s);
    if (action === 'excluir') this.excluirSubgrupo(s);
  }

  subgrupoCount(grupo: GrupoModel): number {
    if (!grupo.Idgrupo) return 0;
    return this.allSubgrupos.filter(s => Number((s as any).Idgrupo?.Idgrupo ?? (s as any).Idgrupo) === grupo.Idgrupo).length;
  }

  exportarCsv(): void {
    const headers = ['Codigo', 'Descricao', 'Margem'];
    const rows = this.gruposFiltrados.map(g => [
      g.Codigo ?? '',
      g.Descricao ?? '',
      String(g.Margem ?? 0).replace('.', ',')
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grupos.csv';
    a.click();
    URL.revokeObjectURL(url);
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
