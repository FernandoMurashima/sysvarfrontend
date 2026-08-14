import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ColecoesService } from '../../core/services/colecoes.service';
import { Colecao } from '../../core/models/colecao';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-colecoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent],
  templateUrl: './colecoes.component.html',
  styleUrls: ['./colecoes.component.css'],
})
export class ColecoesComponent {
  private fb = inject(FormBuilder);
  private api = inject(ColecoesService);
  private auth = inject(AuthService);

  // UI
  search = '';
  filterEstacao = '';
  filterStatus = '';
  advancedOpen = false;
  columnsOpen = false;
  exportOpen = false;
  private readonly columnsStorageKey = 'sysvar.list.colecoes.columns';
  columns = [
    { key: 'descricao', label: 'Descrição', visible: true, required: true },
    { key: 'codigo', label: 'Código', visible: true, required: false },
    { key: 'estacao', label: 'Estação', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;
  excluirModal: Colecao | null = null;
  selectedColecao: Colecao | null = null;

  // lista/paginação client-side
  colecoes = signal<Colecao[]>([]);
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);

  colecoesFiltradas = computed(() => this.colecoes());

  totalRecords = signal(0);
  total = computed(() => this.totalRecords());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  paged = computed(() => this.colecoes());
  searchSuggestions = computed(() => {
    const valores = this.colecoes().flatMap(item => [
      item.Codigo,
      item.Descricao,
      item.Estacao,
      item.Status,
      this.estLabel(item.Estacao),
      this.statusLabel(item.Status)
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  });

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('produtos', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('produtos');
  }

  // form
  showForm = false;
  editingId: number | null = null;
  consultando = false;
  form: FormGroup = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: [null, [Validators.required, Validators.pattern(/^\d{2}$/)]],
    Estacao: [null, [Validators.required]],
    Status: [null, [Validators.required]],
  });

  // selects
  estacoes = [
    { value: '01', label: 'Verão' },
    { value: '02', label: 'Outono' },
    { value: '03', label: 'Inverno' },
    { value: '04', label: 'Primavera' },
  ];
  statusOpts = [
    { value: 'CR', label: 'Criação' },
    { value: 'PD', label: 'Produção' },
    { value: 'AT', label: 'Ativa' },
    { value: 'EN', label: 'Encerrada' },
    { value: 'AR', label: 'Arquivada' },
  ];

  private estacaoMap = new Map(this.estacoes.map(o => [o.value, o.label]));
  private statusMap  = new Map(this.statusOpts.map(o => [o.value, o.label]));
  estLabel(v: string | null | undefined): string { return v ? (this.estacaoMap.get(v) ?? v) : ''; }
  statusLabel(v: string | null | undefined): string { return v ? (this.statusMap.get(v) ?? v) : ''; }

  constructor() {
    this.loadColumnsPreference();
    effect(() => {
      const tp = this.totalPages();
      if (this.page() > tp) this.page.set(tp);
    });
    this.load();
  }

  // ---------- lista/pager ----------
  load() {
    this.loading.set(true);
    this.api.list({ search: this.search || undefined, Estacao: this.filterEstacao || undefined, Status: this.filterStatus || undefined, page: this.page(), page_size: this.pageSize(), ordering: '-Codigo' }).subscribe({
      next: (resp: any) => {
        const rows = Array.isArray(resp) ? resp : (resp?.results ?? []);
        this.colecoes.set(rows);
        this.totalRecords.set(Array.isArray(resp) ? rows.length : (resp?.count ?? rows.length));
        if (this.selectedColecao && !rows.some((item: Colecao) => item.Idcolecao === this.selectedColecao?.Idcolecao)) {
          this.selectedColecao = null;
        }
      },
      error: () => {
        this.successMsg.set(null);
        this.colecoes.set([]);
        this.openErrorOverlay();  // mostra overlay com mensagens do form se houver
        this.loading.set(false);  // <- garante desligar o spinner em erro
      },
      complete: () => this.loading.set(false),
    });
  }
  doSearch() { this.page.set(1); this.load(); }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  clearSearch() { this.search = ''; this.filterEstacao = ''; this.filterStatus = ''; this.page.set(1); this.load(); }
  onPageSizeChange(v: number) { this.pageSize.set(+v); this.page.set(1); this.load(); }
  firstPage() { this.page.set(1); this.load(); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); this.load(); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); this.load(); }
  lastPage() { this.page.set(this.totalPages()); this.load(); }

  selecionarColecaoLinha(row: Colecao): void {
    this.selectedColecao = this.isSelectedColecao(row) ? null : row;
  }

  isSelectedColecao(row: Colecao): boolean {
    return !!this.selectedColecao && this.selectedColecao.Idcolecao === row.Idcolecao;
  }

  consultarSelecionada(): void { if (this.selectedColecao) this.consultar(this.selectedColecao); }
  editarSelecionada(): void { if (this.selectedColecao && this.podeEditarModulo) this.editar(this.selectedColecao); }
  excluirSelecionada(): void { if (this.selectedColecao && this.podeExcluirModulo) this.excluir(this.selectedColecao); }

  // ---------- form ----------
  novo() {
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ Descricao: '', Codigo: null, Estacao: null, Status: 'CR' });
  }

  editar(row: Colecao) {
    this.showForm = true;
    this.editingId = row.Idcolecao!;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      Descricao: row.Descricao ?? '',
      Codigo: row.Codigo ?? null,
      Estacao: row.Estacao ?? null,
      Status: row.Status ?? null,
    });
  }

  consultar(row: Colecao) {
    this.editar(row);
    this.consultando = true;
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
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }

    const body: Partial<Colecao> = { ...this.form.value };
    delete (body as any).Contador;
    this.saving = true;

    const req = this.editingId
      ? this.api.update(this.editingId, body)
      : this.api.create(body);

    req.subscribe({
      next: () => {
        this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'Coleção criada.');
        this.cancelarEdicao();
        this.load();
      },
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
      complete: () => (this.saving = false),
    });
  }

  excluir(row: Colecao) {
    if (!this.podeExcluirModulo) return;
    if (!row.Idcolecao) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const row = this.excluirModal;
    if (!row?.Idcolecao) return;
    this.api.delete(row.Idcolecao).subscribe(() => {
      this.excluirModal = null;
      this.selectedColecao = null;
      this.successMsg.set('Coleção excluída.');
      this.load();
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  // ---------- overlay ----------
  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['Descricao']?.invalid) {
      if (f['Descricao'].errors?.['required']) msgs.push('Descrição: obrigatório.');
      if (f['Descricao'].errors?.['maxlength']) msgs.push('Descrição: máx. 100 caracteres.');
    }
    if (f['Codigo']?.invalid) {
      if (f['Codigo'].errors?.['required']) msgs.push('Código: obrigatório (2 dígitos).');
      if (f['Codigo'].errors?.['pattern']) msgs.push('Código: use dois dígitos, ex.: 26.');
    }
    if (f['Estacao']?.invalid) msgs.push('Estação: obrigatória.');
    if (f['Status']?.invalid) msgs.push('Status: obrigatório.');
    for (const k of Object.keys(f)) {
      if ((f as any)[k].errors?.['server']) msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    }
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }

  visibleColumn(key: string): boolean {
    return this.columns.find(c => c.key === key)?.visible !== false;
  }

  toggleColumn(key: string, visible: boolean): void {
    const col = this.columns.find(c => c.key === key);
    if (!col || col.required) return;
    col.visible = visible;
    this.saveColumnsPreference();
  }

  exportarCsv(): void {
    const headers = ['Descrição', 'Código', 'Estação', 'Status'];
    const rows = this.colecoes().map(item => [
      item.Descricao ?? '',
      item.Codigo ?? '',
      this.estLabel(item.Estacao),
      this.statusLabel(item.Status)
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'colecoes.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  isAtiva(status: string | null | undefined): boolean {
    return status === 'AT';
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


