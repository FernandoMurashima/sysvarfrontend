import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { PacksService } from '../../core/services/pack.service';
import { PackItensService } from '../../core/services/pack-item.service';
import { GradesService } from '../../core/services/grades.service';
import { TamanhosService } from '../../core/services/tamanhos.service';

import { PackModel } from '../../core/models/pack';
import { PackItemModel } from '../../core/models/pack-item';
import { GradeModel } from '../../core/models/grade';
import { TamanhoModel } from '../../core/models/tamanho';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';

@Component({
  selector: 'app-packs',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent],
  templateUrl: './packs.component.html',
  styleUrls: ['./packs.component.css'],
})
export class PacksComponent implements OnInit {
  private fb = inject(FormBuilder);
  private packsApi = inject(PacksService);
  private itensApi = inject(PackItensService);
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
  excluirModal: { tipo: 'pack' | 'item'; titulo: string; pack?: PackModel; item?: PackItemModel } | null = null;

  packs: PackModel[] = [];
  items: PackItemModel[] = [];
  grades: GradeModel[] = [];
  tamanhosDaGrade: TamanhoModel[] = [];

  search = '';
  filterGrade = '';
  filterStatus = '';
  advancedOpen = false;
  columnsOpen = false;
  exportOpen = false;
  private readonly columnsStorageKey = 'sysvar.list.packs.columns';
  columns = [
    { key: 'id', label: 'ID', visible: true, required: false },
    { key: 'nome', label: 'Nome', visible: true, required: true },
    { key: 'grade', label: 'Grade', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];
  selectedPackId: number | null = null;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('produtos', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('produtos');
  }
  get searchSuggestions(): string[] {
    const valores = [
      ...this.packs.flatMap(item => [
        item.nome,
        item.ativo ? 'Ativo' : 'Inativo',
        this.getGradeDesc(item.grade)
      ]),
      ...this.items.flatMap(item => [
        this.getTamanhoDesc(item.tamanho),
        String(item.qtd ?? '')
      ])
    ].filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  formModePack: 'new' | 'edit' | null = null;
  editingPackId: number | null = null;
  consultandoPack = false;

  formPack = this.fb.group({
    nome: ['', [Validators.maxLength(80)]],
    grade: [null as number | null, [Validators.required]],
    ativo: [true],
  });

  editingItemId: number | null = null;
  consultandoItem = false;
  submittedSub = false;

  formItem = this.fb.group({
    pack: [0, [Validators.required]],
    tamanho: [null as number | null, [Validators.required]],
    qtd: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadGrades();
    this.loadPacks();
  }

  // ===== helpers p/ template (evita arrow em template) =====
  getGradeDesc(id: number | null | undefined): string {
    if (!id) return '';
    const g = this.grades.find(x => x.Idgrade === id);
    return g?.Descricao ?? String(id);
  }
  getTamanhoDesc(id: number | null | undefined): string {
    if (!id) return '';
    const t = this.tamanhosDaGrade.find(x => x.Idtamanho === id);
    return t ? (t.Tamanho || (t.Descricao ?? String(id))) : String(id);
  }

  // ===== MASTER =====
  loadGrades() {
    this.gradesApi.list({ ordering: 'Descricao' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.grades = Array.isArray(rows) ? rows : [];
      },
      error: () => {},
    });
  }

  loadPacks() {
    this.loading = true; this.errorMsg = '';
    this.packsApi.list({ search: this.search, ordering: '-data_cadastro' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        const grade = this.filterGrade ? Number(this.filterGrade) : null;
        this.packs = (Array.isArray(rows) ? rows : []).filter((p: PackModel) => {
          const matchesGrade = !grade || p.grade === grade;
          const matchesStatus = !this.filterStatus || String(!!p.ativo) === this.filterStatus;
          return matchesGrade && matchesStatus;
        });
      },
      error: () => (this.errorMsg = 'Falha ao carregar packs.'),
      complete: () => (this.loading = false),
    });
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.loadPacks(); }
  doSearch() { this.loadPacks(); }
  clearSearch() { this.search = ''; this.filterGrade = ''; this.filterStatus = ''; this.loadPacks(); }

  novoPack() {
    this.editingPackId = null;
    this.consultandoPack = false;
    this.formModePack = 'new';
    this.submitted = false;
    this.formPack.enable({ emitEvent: false });
    this.formPack.reset({ nome: '', grade: null, ativo: true });
    this.successMsg = ''; this.errorMsg = '';
  }

  editarPack(p: PackModel) {
    this.editingPackId = p.id ?? null;
    this.consultandoPack = false;
    this.formModePack = 'edit';
    this.submitted = false;
    this.formPack.enable({ emitEvent: false });
    this.formPack.reset({ nome: p.nome ?? '', grade: p.grade ?? null, ativo: !!p.ativo });
    this.successMsg = ''; this.errorMsg = '';
  }

  consultarPack(p: PackModel) {
    this.editarPack(p);
    this.consultandoPack = true;
    this.formPack.disable({ emitEvent: false });
  }

  salvarPack() {
    this.submitted = true;
    if (this.formPack.invalid) { this.errorMsg = 'Revise os campos destacados.'; return; }
    this.saving = true; this.errorMsg = ''; this.successMsg = '';

    const raw = this.formPack.getRawValue();
    const payload = {
      nome: (raw.nome ?? '') || null,
      grade: Number(raw.grade),
      ativo: !!raw.ativo
    };

    const isEdit = !!this.editingPackId;
    const req$ = isEdit
      ? this.packsApi.update(this.editingPackId!, payload)
      : this.packsApi.create(payload);

    req$.subscribe({
      next: (p) => {
        this.successMsg = isEdit ? 'Pack atualizado.' : 'Pack criado.';
        this.loadPacks();
        this.cancelarEdicaoPack();
        if (!isEdit && (p as any)?.id) this.selecionarPack((p as any).id, (p as any).grade);
      },
      error: (err: HttpErrorResponse) => {
        const detail = (err?.error?.detail || err?.error?.error || err?.error) ?? '';
        this.errorMsg = (typeof detail === 'string' && detail) ? detail : 'Falha ao salvar o pack.';
      },
      complete: () => (this.saving = false),
    });
  }

  excluirPack(p: PackModel) {
    if (!this.podeExcluirModulo) return;
    if (!p.id) return;
    this.excluirModal = {
      tipo: 'pack',
      titulo: `Excluir o pack "${p.nome || ('#' + p.id)}"?`,
      pack: p,
    };
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const modal = this.excluirModal;
    if (!modal) return;
    if (modal.tipo === 'pack' && modal.pack) {
      this.executarExclusaoPack(modal.pack);
      return;
    }
    if (modal.tipo === 'item' && modal.item) {
      this.executarExclusaoItem(modal.item);
    }
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  private executarExclusaoPack(p: PackModel): void {
    this.packsApi.remove(p.id!).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Pack excluído.';
        if (this.selectedPackId === p.id) this.fecharItens();
        this.loadPacks();
        if (this.editingPackId === p.id) this.novoPack();
      },
      error: () => (this.errorMsg = 'Falha ao excluir o pack.'),
    });
  }

  cancelarEdicaoPack() {
    this.editingPackId = null;
    this.consultandoPack = false;
    this.formModePack = null;
    this.submitted = false;
    this.formPack.enable({ emitEvent: false });
    this.formPack.reset({ nome: '', grade: null, ativo: true });
  }

  fieldInvalidPack(name: string) {
    const c = this.formPack.get(name);
    return (c?.touched || this.submitted) && c?.invalid;
  }
  getPackErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidPack('grade')) msgs.push('Selecione a Grade.');
    return msgs;
  }

  // ===== SUB: ITENS =====
  selecionarPack(id: number, gid: number) {
    this.selectedPackId = id;
    this.formItem.patchValue({ pack: id });
    this.loadItens(id);
    this.loadTamanhos(gid);
    this.novoItem();
  }

  fecharItens() {
    this.selectedPackId = null;
    this.items = [];
    this.tamanhosDaGrade = [];
    this.novoItem();
  }

  loadItens(packId: number) {
    this.itensApi.list({ pack: packId, ordering: 'tamanho' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.items = Array.isArray(rows) ? rows : [];
      },
      error: () => (this.errorMsg = 'Falha ao carregar itens do pack.'),
    });
  }

  loadTamanhos(gid: number) {
    if (!gid) { this.tamanhosDaGrade = []; return; }
    this.tamanhosApi.list({ idgrade: gid, ordering: 'Tamanho' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.tamanhosDaGrade = Array.isArray(rows) ? rows : [];
      },
      error: () => {},
    });
  }

  novoItem() {
    if (!this.selectedPackId) return;
    this.editingItemId = null;
    this.consultandoItem = false;
    this.submittedSub = false;
    this.formItem.enable({ emitEvent: false });
    this.formItem.reset({ pack: this.selectedPackId, tamanho: null, qtd: 1 });
  }

  editarItem(it: PackItemModel) {
    this.editingItemId = it.id ?? null;
    this.consultandoItem = false;
    this.submittedSub = false;
    this.formItem.enable({ emitEvent: false });
    this.formItem.reset({ pack: it.pack, tamanho: it.tamanho, qtd: it.qtd });
  }

  consultarItem(it: PackItemModel) {
    this.editarItem(it);
    this.consultandoItem = true;
    this.formItem.disable({ emitEvent: false });
  }

  salvarItem() {
    this.submittedSub = true;
    if (this.formItem.invalid || !this.selectedPackId) return;

    const raw = this.formItem.getRawValue();
    const payload = {
      pack: Number(raw.pack),
      tamanho: Number(raw.tamanho),
      qtd: Number(raw.qtd),
    };

    const req$ = this.editingItemId
      ? this.itensApi.update(this.editingItemId, payload)
      : this.itensApi.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingItemId ? 'Item atualizado.' : 'Item adicionado.';
        this.loadItens(this.selectedPackId!);
        this.novoItem();
      },
      error: () => (this.errorMsg = 'Falha ao salvar o item do pack.'),
    });
  }

  excluirItem(it: PackItemModel) {
    if (!this.podeExcluirModulo) return;
    if (!it.id) return;
    this.excluirModal = {
      tipo: 'item',
      titulo: 'Excluir este item do pack?',
      item: it,
    };
  }

  private executarExclusaoItem(it: PackItemModel): void {
    this.itensApi.remove(it.id!).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Item excluído.';
        if (this.selectedPackId) this.loadItens(this.selectedPackId);
      },
      error: () => (this.errorMsg = 'Falha ao excluir o item do pack.'),
    });
  }

  cancelarEdicaoItem() { this.novoItem(); }

  fieldInvalidItem(name: string) {
    const c = this.formItem.get(name);
    return (c?.touched || this.submittedSub) && c?.invalid;
  }
  getItemErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidItem('tamanho')) msgs.push('Selecione o Tamanho.');
    if (this.fieldInvalidItem('qtd')) msgs.push('Informe a Quantidade (>= 1).');
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

  packActions(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'itens', label: 'Itens', icon: '☷' },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  itemActions(): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcaoPack(action: string | Event, p: PackModel): void {
    if (typeof action !== 'string') return;
    if (action === 'consultar') this.consultarPack(p);
    if (action === 'editar') this.editarPack(p);
    if (action === 'itens') this.selecionarPack(p.id!, p.grade);
    if (action === 'excluir') this.excluirPack(p);
  }

  executarAcaoItem(action: string | Event, item: PackItemModel): void {
    if (typeof action !== 'string') return;
    if (action === 'consultar') this.consultarItem(item);
    if (action === 'editar') this.editarItem(item);
    if (action === 'excluir') this.excluirItem(item);
  }

  exportarCsv(): void {
    const headers = ['ID', 'Nome', 'Grade', 'Status'];
    const rows = this.packs.map(p => [
      String(p.id ?? ''),
      p.nome ?? '',
      this.getGradeDesc(p.grade),
      p.ativo ? 'Ativo' : 'Inativo'
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'packs.csv';
    a.click();
    URL.revokeObjectURL(url);
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
