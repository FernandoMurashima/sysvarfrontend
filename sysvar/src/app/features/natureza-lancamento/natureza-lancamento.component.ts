import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';
import { NatLancamento } from '../../core/models/natureza-lancamento';
import { EmpresasService } from '../../core/services/empresas.service';
import { Empresa } from '../../core/models/empresa';
import { AuthService } from '../../core/auth.service';
import { PlanoContabil } from '../../core/models/plano-contabil';
import { PlanoContabilService } from '../../core/services/plano-contabil.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';

@Component({
  selector: 'app-nat-lancamentos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent, SummaryCardComponent],
  templateUrl: './natureza-lancamento.component.html',
  styleUrls: ['./natureza-lancamento.component.css']
})
export class NatLancamentosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(NatLancamentosService);
  private empresasApi = inject(EmpresasService);
  private auth = inject(AuthService);
  private planoApi = inject(PlanoContabilService);

  search = '';
  filterOperacao = '';
  filterTipo = '';
  filterStatus = '';
  filterCategoria = '';
  filterConta = '';
  filterDre = '';
  advancedOpen = false;
  loading = false;
  saving = false;
  submitted = false;

  showForm = false;
  editingId: number | null = null;
  consultando = false;

  successMsg = '';
  errorMsg = '';
  excluirModal: NatLancamento | null = null;
  errorOverlayOpen = false;
  columnsOpen = false;
  exportOpen = false;
  private readonly columnsStorageKey = 'sysvar.list.naturezas.columns';
  columns = [
    { key: 'categoria', label: 'Categoria', visible: true, required: false },
    { key: 'subcategoria', label: 'Subcategoria', visible: true, required: false },
    { key: 'tipo', label: 'Tipo', visible: true, required: false },
    { key: 'operacao', label: 'Operação', visible: true, required: false },
    { key: 'dre', label: 'DRE', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
    { key: 'tipo_natureza', label: 'Tipo Natureza', visible: true, required: false },
    { key: 'conta', label: 'Conta', visible: true, required: false },
    { key: 'descricao', label: 'Descrição', visible: true, required: false },
  ];
  empresas: Empresa[] = [];
  planoContabil: PlanoContabil[] = [];

  readonly operacoes = [
    { value: 'RECEITA', label: 'Receita' },
    { value: 'DESPESA', label: 'Despesa' },
    { value: 'TRANSFERENCIA', label: 'Transferência' },
    { value: 'AJUSTE', label: 'Ajuste' },
  ];
  readonly tiposNatureza = [
    { value: 'CREDITO', label: 'Crédito' },
    { value: 'DEBITO', label: 'Débito' },
    { value: 'NEUTRO', label: 'Neutro' },
  ];
  readonly statusOptions = [
    { value: 'ATIVO', label: 'Ativo' },
    { value: 'INATIVO', label: 'Inativo' },
  ];
  readonly tiposOptions = [
    { value: 'OPERACIONAL', label: 'Operacional' },
    { value: 'FINANCEIRO', label: 'Financeiro' },
    { value: 'INVESTIMENTO', label: 'Investimento' },
    { value: 'FISCAL', label: 'Fiscal/Impostos' },
    { value: 'TRANSFERENCIA', label: 'Transferência' },
    { value: 'AJUSTE', label: 'Ajuste' },
    { value: 'RECEITA', label: 'Receita' },
    { value: 'DESPESA', label: 'Despesa' },
  ];

  form: FormGroup = this.fb.group({
    empresa: [null as number | null],
    codigo: ['', [Validators.required, Validators.maxLength(10)]],
    categoria_principal: ['', [Validators.required, Validators.maxLength(50)]],
    subcategoria: ['', [Validators.required, Validators.maxLength(50)]],
    descricao: ['', [Validators.required, Validators.maxLength(255)]],
    tipo: ['', [Validators.required, Validators.maxLength(20)]],
    status: ['', [Validators.required, Validators.maxLength(10)]],
    tipo_natureza: ['', [Validators.required, Validators.maxLength(10)]],
    natureza_operacao: ['DESPESA', [Validators.required, Validators.maxLength(20)]],
    categoria_gerencial: ['', [Validators.maxLength(50)]],
    movimenta_financeiro: [true],
    entra_dre: [true],
    plano_contabil: [null as number | null],
    conta_contabil: ['', [Validators.maxLength(50)]],
    ativo: [true],
  });

  // lista + paginação client-side
  itensAll: NatLancamento[] = [];
  itens: NatLancamento[] = [];
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }

  get isSuperUser(): boolean { return !!this.auth.getCurrentUser()?.is_superuser; }
  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('cadastros', true) !== false; }
  get podeExcluirModulo(): boolean { return this.auth.podeExcluirModulo('cadastros'); }
  get searchSuggestions(): string[] {
    const valores = this.itensAll.flatMap(item => [
      item.codigo,
      item.descricao,
      item.categoria_principal,
      item.subcategoria,
      item.categoria_gerencial || '',
      item.tipo,
      item.status,
      item.tipo_natureza,
      item.natureza_operacao || '',
      item.plano_contabil_codigo || '',
      item.plano_contabil_descricao || ''
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  get indicadores() {
    const total = this.itensAll.length;
    const ativas = this.itensAll.filter(n => n.ativo !== false).length;
    const receitas = this.itensAll.filter(n => n.natureza_operacao === 'RECEITA').length;
    const despesas = this.itensAll.filter(n => n.natureza_operacao === 'DESPESA').length;
    const dre = this.itensAll.filter(n => !!n.entra_dre).length;
    return { total, ativas, receitas, despesas, dre };
  }

  get categoriasOptions(): string[] {
    return Array.from(new Set(
      this.itensAll
        .map(n => (n.categoria_principal || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get itensFiltrados(): NatLancamento[] {
    const term = this.normalize(this.search);
    const operacao = this.filterOperacao;
    const tipo = this.filterTipo;
    const status = this.filterStatus;
    const categoria = this.normalize(this.filterCategoria);
    const conta = this.normalize(this.filterConta);
    const dre = this.filterDre;

    return this.itensAll.filter(n => {
      const haystack = this.normalize([
        n.codigo,
        n.descricao,
        n.categoria_principal,
        n.subcategoria,
        n.categoria_gerencial,
        n.tipo,
        n.status,
        n.tipo_natureza,
        n.natureza_operacao,
        this.contaLabel(n),
      ].filter(Boolean).join(' '));

      if (term && !haystack.includes(term)) return false;
      if (operacao && n.natureza_operacao !== operacao) return false;
      if (tipo && n.tipo !== tipo) return false;
      if (status === 'ATIVO' && n.ativo === false) return false;
      if (status === 'INATIVO' && n.ativo !== false) return false;
      if (categoria && this.normalize(n.categoria_principal || '') !== categoria) return false;
      if (conta && !this.normalize(this.contaLabel(n)).includes(conta)) return false;
      if (dre === 'SIM' && !n.entra_dre) return false;
      if (dre === 'NAO' && n.entra_dre) return false;
      return true;
    });
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadEmpresas();
    this.loadPlanoContabil();
    this.load();
  }

  loadEmpresas(): void {
    this.empresasApi.list({ page_size: 500, ordering: 'nome' }).subscribe({
      next: res => {
        this.empresas = Array.isArray(res) ? res : (res?.results ?? []);
        if (this.isSuperUser && !this.form.get('empresa')?.value && this.empresas.length === 1) {
          this.form.patchValue({ empresa: this.empresas[0].id ?? null });
        }
      },
      error: () => { this.empresas = []; }
    });
  }

  loadPlanoContabil(): void {
    this.planoApi.list({ page_size: 3000, ordering: 'codigo', ativa: true }).subscribe({
      next: res => {
        this.planoContabil = Array.isArray(res) ? res : (res?.results ?? []);
      },
      error: () => { this.planoContabil = []; }
    });
  }

  contasContabeisDisponiveis(): PlanoContabil[] {
    const empresa = this.form.get('empresa')?.value;
    return this.planoContabil.filter(conta =>
      conta.ativa !== false &&
      conta.analitica !== false &&
      (!this.isSuperUser || !empresa || Number(conta.empresa) === Number(empresa))
    );
  }

  load(): void {
    this.loading = true;
    this.api.list({ page_size: 2000, ordering: 'codigo' }).subscribe({
      next: (res: any) => {
        const arr: NatLancamento[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.itensAll = arr;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.itensAll = []; this.itens = []; this.total = 0;
        this.loading = false; this.errorMsg = 'Falha ao carregar.';
      }
    });
  }

  applyPage(): void {
    const filtered = this.itensFiltrados;
    this.total = filtered.length;
    if (this.page > this.totalPages) this.page = this.totalPages;
    const a = (this.page - 1) * this.pageSize;
    const b = a + this.pageSize;
    this.itens = filtered.slice(a, b);
  }

  onPageSizeChange(v: string): void {
    this.pageSize = Number(v) || 10;
    localStorage.setItem('sysvar.list.naturezas.pageSize', String(this.pageSize));
    this.page = 1;
    this.applyPage();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.applyPage(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void { if (this.page !== this.totalPages) { this.page = this.totalPages; this.applyPage(); } }

  onSearchKeyup(ev: KeyboardEvent): void { if (ev.key === 'Enter') this.doSearch(); }
  doSearch(): void { this.page = 1; this.applyPage(); }
  clearSearch(): void {
    this.search = '';
    this.filterOperacao = '';
    this.filterTipo = '';
    this.filterStatus = '';
    this.filterCategoria = '';
    this.filterConta = '';
    this.filterDre = '';
    this.page = 1;
    this.applyPage();
  }

  novo(): void {
    if (!this.podeEditarModulo) return;
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({
      codigo: '', categoria_principal: '', subcategoria: '',
      descricao: '', tipo: 'OPERACIONAL', status: 'ATIVO', tipo_natureza: 'DEBITO',
      natureza_operacao: 'DESPESA', categoria_gerencial: '', movimenta_financeiro: true,
      entra_dre: true, plano_contabil: null, conta_contabil: '', ativo: true,
      empresa: this.isSuperUser && this.empresas.length === 1 ? this.empresas[0].id ?? null : null
    });
  }

  editar(row: NatLancamento, modoConsulta = false): void {
    if (!modoConsulta && !this.podeEditarModulo) return;
    this.showForm = true;
    this.editingId = row.idnatureza ?? null;
    this.consultando = modoConsulta;
    this.submitted = false;
    this.successMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({
      codigo: row.codigo ?? '',
      categoria_principal: row.categoria_principal ?? '',
      subcategoria: row.subcategoria ?? '',
      descricao: row.descricao ?? '',
      tipo: row.tipo ?? '',
      status: row.status ?? '',
      tipo_natureza: row.tipo_natureza ?? '',
      natureza_operacao: row.natureza_operacao ?? 'DESPESA',
      categoria_gerencial: row.categoria_gerencial ?? '',
      movimenta_financeiro: row.movimenta_financeiro ?? true,
      entra_dre: row.entra_dre ?? true,
      plano_contabil: row.plano_contabil ?? null,
      conta_contabil: row.conta_contabil ?? '',
      ativo: row.ativo ?? true,
      empresa: row.empresa ?? null
    });
  }

  consultar(row: NatLancamento): void {
    this.editar(row, true);
    this.form.disable({ emitEvent: false });
  }

  rowActions(row: NatLancamento): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string, row: NatLancamento): void {
    if (action === 'consultar') this.consultar(row);
    if (action === 'editar') this.editar(row);
    if (action === 'excluir') this.excluir(row);
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
    const headers = ['Código', 'Categoria', 'Subcategoria', 'Tipo', 'Operação', 'DRE', 'Status', 'Tipo Natureza', 'Conta', 'Descrição'];
    const body = this.itensFiltrados.map(n => [
      n.codigo,
      n.categoria_principal || '',
      n.subcategoria || '',
      n.tipo || '',
      n.natureza_operacao || '',
      n.entra_dre ? 'Sim' : 'Não',
      n.ativo === false ? 'Inativo' : 'Ativo',
      n.tipo_natureza || '',
      this.contaLabel(n),
      n.descricao || '',
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'naturezas-lancamento.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.exportOpen = false;
  }

  trackNatureza(_: number, natureza: NatLancamento): number | string {
    return natureza.idnatureza ?? natureza.codigo ?? natureza.descricao;
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
    if (!this.podeEditarModulo) return;
    this.submitted = true;
    if (this.isSuperUser && !this.form.get('empresa')?.value) {
      this.form.get('empresa')?.setErrors({ required: true });
    }
    if (this.form.invalid) { this.openErrorOverlayIfNeeded(); return; }

    const payload = this.form.value as NatLancamento;
    if (!this.isSuperUser) delete (payload as any).empresa;
    this.saving = true;

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas.' : 'Registro criado.';
        this.cancelarEdicao();
        this.page = 1;
        this.load();
      },
      error: (err) => {
        this.saving = false;
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

  excluir(row: NatLancamento): void {
    if (!this.podeExcluirModulo) return;
    const id = row.idnatureza;
    if (!id) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const row = this.excluirModal;
    const id = row?.idnatureza;
    if (!id) return;
    this.api.delete(id).subscribe({
      next: () => { 
        this.excluirModal = null;
        const eraUltimo = this.itens.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
        this.successMsg = 'Excluído.';
      },
      error: () => { this.errorMsg = 'Falha ao excluir.'; }
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const req = (name: string, label: string, max?: number) => {
      const c = f.get(name);
      if (!c) return;
      if (c.hasError('required')) msgs.push(`${label} é obrigatório.`);
      if (max && c.hasError('maxlength')) msgs.push(`${label}: máx. ${max} caracteres.`);
      const s = c.errors?.['server']; if (s) msgs.push(`${label}: ${s}`);
    };
    req('codigo', 'Código', 10);
    req('categoria_principal', 'Categoria', 50);
    req('subcategoria', 'Subcategoria', 50);
    req('descricao', 'Descrição', 255);
    req('tipo', 'Tipo', 20);
    req('status', 'Status', 10);
    req('tipo_natureza', 'Tipo de Natureza', 10);
    req('natureza_operacao', 'Operação', 20);
    req('categoria_gerencial', 'Categoria gerencial', 50);
    req('conta_contabil', 'Conta contábil', 50);
    if (this.isSuperUser) req('empresa', 'Empresa');
    return msgs;
  }

  contaLabel(n: NatLancamento): string {
    if (n.plano_contabil_codigo) return `${n.plano_contabil_codigo} - ${n.plano_contabil_descricao || ''}`.trim();
    return n.conta_contabil || '-';
  }

  percentual(valor: number): string {
    const total = this.indicadores.total || 0;
    if (!total) return '0% do total';
    return `${((valor / total) * 100).toFixed(0)}% do total`;
  }

  private normalize(value: string): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  openErrorOverlayIfNeeded(): void { this.errorOverlayOpen = this.getFormErrors().length > 0; }
  closeErrorOverlay(): void { this.errorOverlayOpen = false; }

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.naturezas.pageSize'));
    if ([10, 20, 50, 100].includes(size)) this.pageSize = size;
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
