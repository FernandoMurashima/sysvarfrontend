import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Observable, Subscription } from 'rxjs';

import { Produto } from '../../core/models/produto';
import { ProdutosService } from '../../core/services/produtos.service';

import { GruposService } from '../../core/services/grupos.service';
import { SubgruposService } from '../../core/services/subgrupos.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { MateriaisService } from '../../core/services/material.service';
import { NcmsService } from '../../core/services/ncms.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';

type ItemRef = { id: number; label: string };

@Component({
  selector: 'app-produtos-uso',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    SearchSuggestComponent,
    PageHeaderComponent,
    RowActionsMenuComponent,
    SummaryCardComponent,
  ],
  templateUrl: './produtos-uso.component.html',
  styleUrls: ['./produtos-uso.component.css'],
})
export class ProdutosUsoComponent {
  private fb = inject(FormBuilder);
  private api = inject(ProdutosService);
  private auth = inject(AuthService);

  private gruposApi = inject(GruposService);
  private subgruposApi = inject(SubgruposService);
  private unidadesApi = inject(UnidadesService);
  private materiaisApi = inject(MateriaisService);
  private ncmsApi = inject(NcmsService);

  // navegação
  view = signal<'list' | 'form'>('list');
  setViewList() { this.view.set('list'); this.cancelarEdicao(); this.load(); }
  setViewForm() { this.view.set('form'); }

  // flags
  search = '';
  filterTipo = '';
  filterUnidade = '';
  filterStatus = '';
  filterNcm = '';
  filterReferencia = '';
  filterCodigo = '';
  advancedOpen = false;
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;
  excluirModal: Produto | null = null;
  segurancaModal: {
    action: 'inativar' | 'bloquear';
    produto: Produto;
    title: string;
    motivo: string;
    senha: string;
  } | null = null;
  columnsOpen = false;
  exportOpen = false;
  private readonly columnsStorageKey = 'sysvar.list.produtos-uso.columns';
  columns = [
    { key: 'reduzido', label: 'Código reduzido', visible: true, required: false },
    { key: 'referencia', label: 'Referência', visible: true, required: false },
    { key: 'tipo', label: 'Tipo', visible: true, required: false },
    { key: 'unidade', label: 'Unidade', visible: true, required: false },
    { key: 'ncm', label: 'NCM', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];

  // lista / pager
  produtos = signal<Produto[]>([]);
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);

  produtosFiltrados = computed(() => {
    const term = this.normalize(this.search);
    const tipo = this.filterTipo;
    const unidade = this.normalize(this.filterUnidade);
    const status = this.filterStatus;
    const ncm = this.normalize(this.filterNcm);
    const referencia = this.normalize(this.filterReferencia);
    const codigo = this.normalize(this.filterCodigo);

    return this.produtos().filter(p => {
      const haystack = this.normalize([
        p.descricao,
        p.descricao_reduzida,
        p.referencia,
        p.ncm,
        this.unidadeLabel(p.unidade ?? null),
        this.tipoProdutoLabel(p.tipo_produto),
      ].filter(Boolean).join(' '));
      if (term && !haystack.includes(term)) return false;
      if (tipo && p.tipo_produto !== tipo) return false;
      if (unidade && this.normalize(this.unidadeLabel(p.unidade ?? null)) !== unidade) return false;
      if (status === 'ATIVO' && p.ativo === false) return false;
      if (status === 'INATIVO' && p.ativo !== false) return false;
      if (status === 'BLOQUEADO' && !p.bloqueado_venda) return false;
      if (ncm && !this.normalize(p.ncm || '').includes(ncm)) return false;
      if (referencia && !this.normalize(p.referencia || '').includes(referencia)) return false;
      if (codigo && !this.normalize(p.descricao_reduzida || '').includes(codigo)) return false;
      return true;
    });
  });

  total = computed(() => this.produtosFiltrados().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.produtosFiltrados().slice(start, start + this.pageSize());
  });
  searchSuggestions = computed(() => this.produtos().flatMap(p => [
    p.descricao,
    p.descricao_reduzida,
    p.referencia,
    p.ncm,
    this.unidadeLabel(p.unidade ?? null),
    this.tipoProdutoLabel(p.tipo_produto),
  ].filter((v): v is string => !!v)));

  indicadores = computed(() => {
    const rows = this.produtos();
    const total = rows.length;
    const ativos = rows.filter(p => p.ativo !== false).length;
    const insumos = rows.filter(p => p.tipo_produto === '4').length;
    const usoConsumo = rows.filter(p => p.tipo_produto === '2').length;
    const bloqueados = rows.filter(p => !!p.bloqueado_venda).length;
    return { total, ativos, usoConsumo, insumos, bloqueados };
  });

  // form
  showForm = false;
  editingId: number | null = null;
  consultando = false;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('produtos', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('produtos');
  }

  form: FormGroup = this.fb.group({
    tipo_produto: ['2', [Validators.required]],
    referencia: [{ value: '', disabled: true }],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    descricao_reduzida: [null, [Validators.maxLength(60)]],

    unidade: [null, [Validators.required]],
    grupo: [null],
    subgrupo: [null],
    material: [null],

    // NCM opcional (se preencher, tem que ser ####.##.##)
    ncm: [null, [Validators.pattern(/^\d{4}\.\d{2}\.\d{2}$/)]],

    observacoes: [null],
  });

  // streams/options
  ncms$: Observable<any[]> = this.ncmsApi.list('');

  grupos: ItemRef[] = [];
  subgrupos: ItemRef[] = [];
  unidades: ItemRef[] = [];
  materiais: ItemRef[] = [];

  private unidadeMap = new Map<number, string>();
  private subGrupoSub?: Subscription;
  private tipoProdutoSub?: Subscription;

  constructor() {
    effect(() => {
      const tp = this.totalPages();
      if (this.page() > tp) this.page.set(tp);
    });

    this.loadLookups();
    this.loadColumnsPreference();
    this.wireGrupoToSubgrupo();
    this.wireTipoProduto();
    this.load();
  }

  // util
  private arrayOrResults<T>(data: any): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && Array.isArray(data.results)) return data.results as T[];
    return [];
  }

  // lookups
  private loadLookups() {
    // Grupos (opcional para uso/consumo)
    this.gruposApi.list({ search: '', ordering: 'Descricao', page_size: 200 }).subscribe({
      next: (rows: any) => {
        const arr = this.arrayOrResults<any>(rows);
        this.grupos = arr
          .slice()
          .sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || ''))
          .map(g => ({ id: g.Idgrupo as number, label: `${g.Descricao}` }));
      },
      error: () => { this.grupos = []; }
    });

    // Unidades (obrigatório)
    this.unidadesApi.list({ search: '', ordering: 'Descricao', page_size: 200 }).subscribe({
      next: (rows: any) => {
        const arr = this.arrayOrResults<any>(rows);
        this.unidades = arr
          .slice()
          .sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || ''))
          .map(u => ({ id: u.Idunidade as number, label: u.Descricao as string }));
        this.unidadeMap.clear();
        this.unidades.forEach(u => this.unidadeMap.set(u.id, u.label));
      },
      error: () => { this.unidades = []; }
    });

    // Materiais (opcional)
    this.materiaisApi.list('').subscribe({
      next: (rows: any[]) => {
        const arr = Array.isArray(rows) ? rows : [];
        this.materiais = arr
          .slice()
          .sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || ''))
          .map(m => ({ id: m.Idmaterial as number, label: m.Descricao as string }));
      },
      error: () => { this.materiais = []; }
    });

    // Subgrupos inicial
    this.loadSubgrupos(null);
  }

  private wireGrupoToSubgrupo() {
    this.subGrupoSub?.unsubscribe();
    this.subGrupoSub = this.form.get('grupo')?.valueChanges.subscribe((idGrupo: number | null) => {
      this.form.patchValue({ subgrupo: null }, { emitEvent: false });
      this.loadSubgrupos(idGrupo ?? null);
    });
  }

  private loadSubgrupos(idGrupo: number | null) {
    if (idGrupo == null) {
      this.subgrupos = [];
      return;
    }

    this.subgruposApi.list({ Idgrupo: idGrupo, ordering: 'Descricao' }).subscribe({
      next: (rows: any) => {
        const arr = this.arrayOrResults<any>(rows);
        this.subgrupos = arr
          .slice()
          .sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || ''))
          .map((sg: any) => ({
            id: sg.Idsubgrupo as number,
            label: sg.Descricao as string,
          }));
      },
      error: () => { this.subgrupos = []; }
    });
  }

  // lista / pager
  load() {
    this.loading.set(true);
    this.api.list({ ordering: '-data_cadastro', ativo: 'all', tipo_produto: '2,4', page_size: 2000 }).subscribe({
      next: (data: any) => {
        const rows = this.arrayOrResults<Produto>(data)
          .filter(p => p.tipo_produto === '2' || p.tipo_produto === '4');
        this.produtos.set(rows);
        this.page.set(1);
      },
      error: () => {
        this.produtos.set([]);
        this.openErrorOverlay();
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  doSearch() { this.page.set(1); }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  clearSearch() {
    this.search = '';
    this.filterTipo = '';
    this.filterUnidade = '';
    this.filterStatus = '';
    this.filterNcm = '';
    this.filterReferencia = '';
    this.filterCodigo = '';
    this.page.set(1);
  }
  onPageSizeChange(v: number) { this.pageSize.set(+v); this.page.set(1); }
  firstPage() { this.page.set(1); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); }
  lastPage() { this.page.set(this.totalPages()); }

  unidadeLabel(id?: number | null) {
    if (!id) return '';
    return this.unidadeMap.get(id) ?? String(id);
  }

  private wireTipoProduto() {
    this.tipoProdutoSub?.unsubscribe();
    this.tipoProdutoSub = this.form.get('tipo_produto')?.valueChanges.subscribe((tipo: string | null) => {
      if (tipo === '4') {
        this.form.patchValue({ grupo: null, subgrupo: null }, { emitEvent: false });
        this.loadSubgrupos(null);
      }
    });
  }

  tipoProdutoLabel(tipo?: string | null): string {
    if (tipo === '4') return 'Insumo de Produção';
    return 'Uso/Consumo';
  }

  statusLabel(p: Produto): string {
    if (p.bloqueado_venda) return 'Bloqueado';
    return p.ativo === false ? 'Inativo' : 'Ativo';
  }

  percentual(valor: number): string {
    const total = this.indicadores().total || 0;
    if (!total) return '0% do total';
    return `${((valor / total) * 100).toFixed(0)}% do total`;
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

  rowActions(row: Produto): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'inativar', label: row.ativo ? 'Inativar' : 'Ativar', icon: '⊘', visible: this.podeEditarModulo },
      { key: 'bloquear', label: row.bloqueado_venda ? 'Desbloquear' : 'Bloquear', icon: '▣', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string, row: Produto): void {
    if (action === 'consultar') this.consultar(row);
    if (action === 'editar') this.editar(row);
    if (action === 'inativar') this.toggleAtivo(row);
    if (action === 'bloquear') this.toggleBloqueio(row);
    if (action === 'excluir') this.excluir(row);
  }

  exportarCsv(): void {
    const headers = ['Descrição', 'Código reduzido', 'Referência', 'Tipo', 'Unidade', 'NCM', 'Status'];
    const body = this.produtosFiltrados().map(p => [
      p.descricao || '',
      p.descricao_reduzida || '',
      p.referencia || '',
      this.tipoProdutoLabel(p.tipo_produto),
      this.unidadeLabel(p.unidade ?? null),
      p.ncm || '',
      this.statusLabel(p),
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'produtos-uso-consumo.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.exportOpen = false;
  }

  isInsumoProducao(): boolean {
    return this.form.get('tipo_produto')?.value === '4';
  }

  // form
  novo() {
    this.setViewForm();
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      tipo_produto: '2',
      referencia: '',
      descricao: '',
      descricao_reduzida: null,
      unidade: null,
      grupo: null,
      subgrupo: null,
      material: null,
      ncm: null,
      observacoes: null,
    });
    this.loadSubgrupos(null);
  }

  editar(row: Produto) {
    this.setViewForm();
    this.showForm = true;
    this.editingId = row.Idproduto ?? null;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });

    this.form.reset({
      tipo_produto: row.tipo_produto ?? '2',
      referencia: row.referencia ?? '',
      descricao: row.descricao ?? '',
      descricao_reduzida: row.descricao_reduzida ?? null,
      unidade: row.unidade ?? null,
      grupo: row.grupo ?? null,
      subgrupo: row.subgrupo ?? null,
      material: row.material ?? null,
      ncm: row.ncm ?? null,
      observacoes: row.observacoes ?? null,
    });

    this.loadSubgrupos(row.grupo ?? null);
  }

  consultar(row: Produto) {
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

    const body: Partial<Produto> = {
      ...this.form.value,
      grade: null,
      colecao: null,
      grupo: this.isInsumoProducao() ? null : this.form.value.grupo,
      subgrupo: this.isInsumoProducao() ? null : this.form.value.subgrupo,
      referencia: undefined, // não deve ser enviada
    };

    this.saving = true;

    const req = this.editingId
      ? this.api.update(this.editingId, body)
      : this.api.create(body);

    req.subscribe({
      next: (produtoSalvo: Produto) => {
        this.finishSave();
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
      }
    });
  }

  private finishSave() {
    const isEdit = !!this.editingId;
    this.saving = false;
    this.cancelarEdicao();
    this.setViewList();
    this.showSuccess(isEdit ? 'Alterações salvas.' : 'Produto de uso/consumo criado.');
  }

  excluir(row: Produto) {
    if (!this.podeExcluirModulo) return;
    if (!row.Idproduto) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const row = this.excluirModal;
    if (!row?.Idproduto) return;
    this.api.remove(row.Idproduto).subscribe({
      next: () => {
        this.excluirModal = null;
        this.showSuccess('Produto excluído.');
        this.load();
      },
      error: () => this.showError('Falha ao excluir produto.')
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  // flags (reaproveita endpoints do backend)
  async toggleAtivo(row: Produto) {
    if (!row.Idproduto) return;
    if (row.ativo) {
      this.segurancaModal = {
        action: 'inativar',
        produto: row,
        title: 'Inativar produto',
        motivo: '',
        senha: '',
      };
    } else {
      this.api.ativarProduto(row.Idproduto).subscribe({
        next: (resp) => {
          this.replaceRow(resp as any);
          this.showSuccess('Produto ativado.');
        },
        error: (err) => this.showError(String(err?.error?.detail || 'Falha ao ativar'))
      });
    }
  }

  async toggleBloqueio(row: Produto) {
    if (!row.Idproduto) return;
    if (row.bloqueado_venda) {
      this.api.desbloquearVenda(row.Idproduto).subscribe({
        next: (resp: any) => {
          this.replaceRow(resp);
          this.showSuccess('Produto desbloqueado.');
        },
        error: (err) => this.showError(String(err?.error?.detail || 'Falha ao desbloquear'))
      });
    } else {
      this.segurancaModal = {
        action: 'bloquear',
        produto: row,
        title: 'Bloquear venda do produto',
        motivo: '',
        senha: '',
      };
    }
  }

  confirmarSeguranca(): void {
    const modal = this.segurancaModal;
    const id = modal?.produto.Idproduto;
    if (!modal || !id) return;
    const motivo = modal.motivo.trim();
    if (motivo.length < 3 || !modal.senha) {
      this.showError('Informe motivo com pelo menos 3 caracteres e a senha.');
      return;
    }
    const req = modal.action === 'inativar'
      ? this.api.inativarProduto(id, motivo, modal.senha)
      : this.api.bloquearVenda(id, motivo, modal.senha);
    req.subscribe({
      next: (resp: any) => {
        this.replaceRow(resp);
        this.showSuccess(modal.action === 'inativar' ? 'Produto inativado.' : 'Produto bloqueado.');
        this.segurancaModal = null;
      },
      error: (err) => this.showError(String(err?.error?.detail || 'Falha ao concluir a operação.'))
    });
  }

  fecharSeguranca(): void {
    this.segurancaModal = null;
  }

  private replaceRow(newRow: Produto) {
    const rows = this.produtos().slice();
    const ix = rows.findIndex(r => r.Idproduto === newRow.Idproduto);
    if (ix >= 0) rows[ix] = newRow;
    this.produtos.set(rows);
  }

  private showSuccess(message: string): void {
    this.successMsg.set(message);
    this.errorMsg.set(null);
  }

  private showError(message: string): void {
    this.errorMsg.set(message);
    this.successMsg.set(null);
  }

  // overlay
  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;

    if (f['descricao']?.invalid) {
      if (f['descricao'].errors?.['required']) msgs.push('Descrição: obrigatório.');
      if (f['descricao'].errors?.['maxlength']) msgs.push('Descrição: máx. 120 caracteres.');
    }
    if (f['descricao_reduzida']?.invalid && f['descricao_reduzida'].errors?.['maxlength'])
      msgs.push('Descrição reduzida: máx. 60 caracteres.');

    if (f['unidade']?.invalid && f['unidade'].errors?.['required'])
      msgs.push('Unidade: obrigatória.');

    if (f['ncm']?.invalid) {
      if (f['ncm'].errors?.['pattern']) msgs.push('NCM: use ####.##.##.');
      if ((f as any)['ncm']?.errors?.['server']) msgs.push(`NCM: ${(f as any)['ncm']?.errors?.['server']}`);
    }

    for (const k of Object.keys(f)) {
      if ((f as any)[k].errors?.['server'] && !msgs.some(m => m.includes(k)))
        msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    }
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }

  private normalize(value: string): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
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
    const state = Object.fromEntries(this.columns.map(c => [c.key, c.visible]));
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(state));
  }
}
