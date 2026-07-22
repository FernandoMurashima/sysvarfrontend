import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cfop } from '../../core/models/cfop';
import { CfopsService } from '../../core/services/cfops.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';

@Component({
  selector: 'app-cfops',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent],
  templateUrl: './cfops.component.html',
  styleUrls: ['./cfops.component.css'],
})
export class CfopsComponent {
  private fb = inject(FormBuilder);
  private api = inject(CfopsService);
  private auth = inject(AuthService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;
  excluirModal: Cfop | null = null;
  columnsOpen = false;
  exportOpen = false;
  advancedOpen = false;
  filterTipo = '';
  filterDestino = '';
  filterStatus = '';
  private readonly columnsStorageKey = 'sysvar.list.cfops.columns';
  columns = [
    { key: 'codigo', label: 'CFOP', visible: true, required: true },
    { key: 'descricao', label: 'Descrição', visible: true, required: true },
    { key: 'tipo', label: 'Tipo', visible: true, required: false },
    { key: 'destino', label: 'Destino', visible: true, required: false },
    { key: 'estoque', label: 'Estoque', visible: true, required: false },
    { key: 'financeiro', label: 'Financeiro', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];

  items = signal<Cfop[]>([]);
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);

  filteredItems = computed(() => {
    const tipo = this.filterTipo;
    const destino = this.filterDestino;
    const status = this.filterStatus;
    return this.items().filter(item => {
      if (tipo && item.tipo_operacao !== tipo) return false;
      if (destino && item.destino !== destino) return false;
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
      item.codigo,
      item.descricao,
      item.tipo_operacao,
      item.destino
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  });

  showForm = false;
  editingId: number | null = null;
  consultando = false;
  form: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    descricao: ['', [Validators.required, Validators.maxLength(255)]],
    tipo_operacao: ['VENDA', Validators.required],
    destino: ['DENTRO_UF', Validators.required],
    movimenta_estoque: [true],
    gera_financeiro: [true],
    ativo: [true],
    observacoes: ['', Validators.maxLength(255)],
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
  clearFilters() { this.search = ''; this.filterTipo = ''; this.filterDestino = ''; this.filterStatus = ''; this.load(); }
  onPageSizeChange(v: number) { this.pageSize.set(+v); this.page.set(1); }
  firstPage() { this.page.set(1); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); }
  lastPage() { this.page.set(this.totalPages()); }

  novo() {
    this.showForm = true; this.editingId = null; this.submitted = false; this.consultando = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ codigo: '', descricao: '', tipo_operacao: 'VENDA', destino: 'DENTRO_UF', movimenta_estoque: true, gera_financeiro: true, ativo: true, observacoes: '' });
  }

  editar(row: Cfop) {
    this.showForm = true; this.editingId = row.id ?? null; this.submitted = false; this.consultando = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      codigo: row.codigo ?? '',
      descricao: row.descricao ?? '',
      tipo_operacao: row.tipo_operacao ?? 'VENDA',
      destino: row.destino ?? 'DENTRO_UF',
      movimenta_estoque: row.movimenta_estoque !== false,
      gera_financeiro: row.gera_financeiro !== false,
      ativo: row.ativo !== false,
      observacoes: row.observacoes ?? '',
    });
  }

  consultar(row: Cfop) {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  cancelarEdicao() {
    this.showForm = false; this.editingId = null; this.consultando = false;
    this.form.enable({ emitEvent: false }); this.form.reset();
  }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }
    const body: Partial<Cfop> = this.form.getRawValue();
    this.saving = true;
    const req = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    req.subscribe({
      next: () => { this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'CFOP criado.'); this.cancelarEdicao(); this.load(); },
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

  excluir(row: Cfop) {
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
      this.successMsg.set('CFOP excluído.');
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

  executarAcao(key: string | Event, row: Cfop): void {
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
    const headers = ['CFOP', 'Descrição', 'Tipo', 'Destino', 'Estoque', 'Financeiro', 'Status'];
    const body = this.filteredItems().map(r => [
      r.codigo || '',
      r.descricao || '',
      this.tipoLabel(r.tipo_operacao),
      this.destinoLabel(r.destino),
      r.movimenta_estoque ? 'Sim' : 'Não',
      r.gera_financeiro ? 'Sim' : 'Não',
      r.ativo ? 'Ativo' : 'Inativo',
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cfops.csv';
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

  tipoLabel(v: string): string {
    return ({ VENDA: 'Venda', COMPRA: 'Compra', DEVOLUCAO: 'Devolução', TRANSFERENCIA: 'Transferência', OUTROS: 'Outros' } as any)[v] || v;
  }

  destinoLabel(v: string): string {
    return ({ DENTRO_UF: 'Dentro do estado', FORA_UF: 'Fora do estado', AMBOS: 'Ambos' } as any)[v] || v;
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['codigo']?.invalid) {
      if (f['codigo'].errors?.['required']) msgs.push('CFOP: obrigatório.');
      if (f['codigo'].errors?.['pattern']) msgs.push('CFOP: use 4 dígitos.');
    }
    if (f['descricao']?.invalid) msgs.push('Descrição: obrigatória ou acima do limite.');
    if (f['tipo_operacao']?.invalid) msgs.push('Tipo de operação: obrigatório.');
    if (f['destino']?.invalid) msgs.push('Destino: obrigatório.');
    for (const k of Object.keys(f)) if ((f as any)[k].errors?.['server']) msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }
}
