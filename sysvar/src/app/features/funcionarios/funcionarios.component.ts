import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FuncionariosService } from '../../core/services/funcionarios.service';
import { LojasService } from '../../core/services/lojas.service';
import { Funcionario } from '../../core/models/funcionario';
import { Loja } from '../../core/models/loja';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';

@Component({
  selector: 'app-funcionarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent, SummaryCardComponent],
  templateUrl: './funcionarios.component.html',
  styleUrls: ['./funcionarios.component.css']
})
export class FuncionariosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FuncionariosService);
  private lojasApi = inject(LojasService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;
  consultando = false;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('cadastros', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('cadastros');
  }

  search = '';
  filterLoja: number | '' = '';
  filterCategoria = '';
  filterStatus = '';
  filterCpf = '';
  filterInicio = '';
  filterFim = '';
  advancedOpen = false;
  successMsg = '';
  errorMsg = '';
  excluirModal: Funcionario | null = null;
  errorOverlayOpen = false;
  columnsOpen = false;
  exportOpen = false;
  private readonly columnsStorageKey = 'sysvar.list.funcionarios.columns';
  columns = [
    { key: 'apelido', label: 'Apelido', visible: true, required: false },
    { key: 'cpf', label: 'CPF', visible: true, required: false },
    { key: 'loja', label: 'Loja', visible: true, required: false },
    { key: 'categoria', label: 'Categoria', visible: true, required: false },
    { key: 'meta', label: 'Meta', visible: true, required: false },
    { key: 'comissao', label: 'Comissão %', visible: true, required: false },
    { key: 'salario', label: 'Salário', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
    { key: 'cadastro', label: 'Cadastro', visible: true, required: false },
  ];

  lojasOptions: { id: number; nome: string }[] = [];

  get podeVerSalario(): boolean {
    const user = this.auth.getCurrentUser();
    const permissao = this.auth.permissaoCampo('funcionario.salario');
    if (permissao !== null) return permissao;
    const tipo = String(this.auth.getUserType() || user?.type || '').toLowerCase();
    return !!user?.is_superuser || tipo === 'admin' || tipo === 'diretor';
  }

  form: FormGroup = this.fb.group({
    nomefuncionario: ['', [Validators.required, Validators.maxLength(50)]],
    apelido: ['',[Validators.maxLength(20)]],
    cpf: ['', [this.cpfValidator]],

    inicio: [''],
    fim: [''],

    categoria: ['', [Validators.maxLength(15)]],
    meta: [0, []],
    comissao_percentual: [0, []],
    salario: [0, []],

    idloja: [null],
    ativo: [true],
  });

  private categoriasExigemLoja = new Set([
    'vendedor',
    'caixa',
    'gerente',
    'assistente',
    'assistentereceber',
    'assistentepagar',
    'assistentecontasareceber',
    'assistentecontasapagar'
  ]);

  // Lista + paginação client-side
  funcionariosAll: Funcionario[] = [];
  funcionarios: Funcionario[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
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
    return this.funcionariosAll.flatMap(f => [
      f.nomefuncionario,
      f.apelido,
      f.cpf,
      f.categoria,
      this.lojaNome((f as any).idloja),
    ].filter((v): v is string => !!v));
  }

  get indicadores() {
    const total = this.funcionariosAll.length;
    const ativos = this.funcionariosAll.filter(f => f.ativo !== false).length;
    const vendedores = this.funcionariosAll.filter(f => this.normalize(f.categoria || '').includes('vendedor')).length;
    const caixas = this.funcionariosAll.filter(f => this.normalize(f.categoria || '').includes('caixa')).length;
    const gerentes = this.funcionariosAll.filter(f => this.normalize(f.categoria || '').includes('gerente')).length;
    return { total, ativos, vendedores, caixas, gerentes };
  }

  get categoriasOptions(): string[] {
    return Array.from(new Set(
      this.funcionariosAll
        .map(f => (f.categoria || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get funcionariosFiltrados(): Funcionario[] {
    const term = this.normalize(this.search);
    const categoria = this.normalize(this.filterCategoria);
    const status = this.filterStatus;
    const cpf = this.onlyDigits(this.filterCpf);
    const inicio = this.filterInicio;
    const fim = this.filterFim;

    return this.funcionariosAll.filter(f => {
      const loja = this.lojaNome((f as any).idloja);
      const haystack = this.normalize([
        f.nomefuncionario,
        f.apelido,
        f.cpf,
        f.categoria,
        loja,
      ].filter(Boolean).join(' '));

      if (term && !haystack.includes(term)) return false;
      if (this.filterLoja !== '' && Number((f as any).idloja || 0) !== Number(this.filterLoja)) return false;
      if (categoria && this.normalize(f.categoria || '') !== categoria) return false;
      if (status === 'ATIVO' && f.ativo === false) return false;
      if (status === 'INATIVO' && f.ativo !== false) return false;
      if (cpf && !this.onlyDigits(f.cpf || '').includes(cpf)) return false;
      if (inicio && (f.inicio || '') < inicio) return false;
      if (fim && (f.inicio || '') > fim) return false;
      return true;
    });
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.load();
    this.loadLojas();
  }

  loadLojas(): void {
    this.lojasApi.list({ page_size: 2000, ordering: 'nome_loja' }).subscribe({
      next: (res: any) => {
        const arr: Loja[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.lojasOptions = arr.map(l => ({ id: (l as any).Idloja ?? (l as any).id ?? (l as any).pk ?? 0, nome: l.nome_loja }));
      },
      error: () => { this.lojasOptions = []; }
    });
  }

  // ====== Validadores / formatações ======
  cpfValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw: string = (ctrl.value || '').toString().trim();
    if (!raw) return null; // opcional
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 11) return { cpf: true };
    // rejeita sequências
    if (/^(\d)\1{10}$/.test(digits)) return { cpf: true };

    const calc = (base: string, factorStart: number) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factorStart - i);
      const mod = (sum * 10) % 11;
      return mod === 10 ? 0 : mod;
    };
    const d1 = calc(digits.slice(0, 9), 10);
    const d2 = calc(digits.slice(0,10), 11);
    const ok = (d1 === parseInt(digits[9],10)) && (d2 === parseInt(digits[10],10));
    return ok ? null : { cpf: true };
  }

  onCpfInput(): void {
    const ctrl = this.form.get('cpf');
    if (!ctrl) return;
    const d = (ctrl.value || '').toString().replace(/\D/g, '').slice(0, 11);
    let out = d;
    if (d.length > 3) out = d.slice(0,3) + '.' + d.slice(3);
    if (d.length > 6) out = out.slice(0,7) + '.' + d.slice(6);
    if (d.length > 9) out = out.slice(0,11) + '-' + d.slice(9);
    ctrl.setValue(out, { emitEvent: false });
  }

  private onlyDigits(value: string): string {
    return (value || '').replace(/\D/g, '');
  }

  // ========= Ações =========
  load(): void {
    this.loading = true;
    this.api.list({ page_size: 2000, ordering: 'nomefuncionario' }).subscribe({
      next: (res: any) => {
        const arr: Funcionario[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.funcionariosAll = arr;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.funcionariosAll = [];
        this.funcionarios = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar funcionários.';
      }
    });
  }

  applyPage(): void {
    const filtered = this.funcionariosFiltrados;
    this.total = filtered.length;
    if (this.page > this.totalPages) this.page = this.totalPages;
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.funcionarios = filtered.slice(start, end);
  }

  onPageSizeChange(sizeStr: string): void {
    this.pageSize = Number(sizeStr) || 10;
    localStorage.setItem('sysvar.list.funcionarios.pageSize', String(this.pageSize));
    this.page = 1;
    this.applyPage();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.applyPage(); } }
  prevPage(): void  { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void  { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void  { if (this.page !== this.totalPages) { this.page = this.totalPages; this.applyPage(); } }

  onSearchKeyup(ev: KeyboardEvent): void { if (ev.key === 'Enter') this.doSearch(); }
  doSearch(): void { this.page = 1; this.applyPage(); }
  clearSearch(): void {
    this.search = '';
    this.filterLoja = '';
    this.filterCategoria = '';
    this.filterStatus = '';
    this.filterCpf = '';
    this.filterInicio = '';
    this.filterFim = '';
    this.page = 1;
    this.applyPage();
  }

  lojaNome(id: number | null | undefined): string {
    if (!id) return '';
    return this.lojasOptions.find(l => l.id === id)?.nome || '';
  }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });

    this.form.reset({
      nomefuncionario: '',
      apelido: '',
      cpf: '',
      inicio: '',
      fim: '',
      categoria: '',
      meta: 0,
      comissao_percentual: 0,
      salario: this.podeVerSalario ? 0 : null,
      idloja: null,
      ativo: true,
    });
    if (!this.podeVerSalario) this.form.get('salario')?.disable({ emitEvent: false });
  }

  editar(row: Funcionario): void {
    this.showForm = true;
    this.editingId = (row as any).id ?? null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });

    this.form.reset({
      nomefuncionario: row.nomefuncionario ?? '',
      apelido: row.apelido ?? '',
      cpf: row.cpf ?? '',
      inicio: row.inicio ?? '',
      fim: row.fim ?? '',
      categoria: row.categoria ?? '',
      meta: row.meta ?? 0,
      comissao_percentual: row.comissao_percentual ?? 0,
      salario: row.salario_oculto ? null : (row.salario ?? 0),
      idloja: (row as any).idloja ?? null,
      ativo: row.ativo ?? true,
    });
    if (!this.podeVerSalario || row.salario_oculto) this.form.get('salario')?.disable({ emitEvent: false });
  }

  consultar(row: Funcionario): void {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  rowActions(row: Funcionario): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string, row: Funcionario): void {
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
    const headers = ['Funcionário', 'Apelido', 'CPF', 'Loja', 'Categoria', 'Meta', 'Comissão %', 'Salário', 'Status', 'Cadastro'];
    const body = this.funcionariosFiltrados.map(f => [
      f.nomefuncionario,
      f.apelido || '',
      this.formatCpf(f.cpf),
      this.lojaNome((f as any).idloja) || '',
      f.categoria || '',
      this.formatMoney(f.meta || 0),
      f.comissao_percentual || 0,
      f.salario_oculto ? 'Restrito' : this.formatMoney(f.salario || 0),
      f.ativo === false ? 'Inativo' : 'Ativo',
      this.formatDate(f.data_cadastro),
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'funcionarios.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.exportOpen = false;
  }

  formatCpf(value?: string | null): string {
    const d = (value || '').replace(/\D/g, '').slice(0, 11);
    if (d.length !== 11) return value || '-';
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  formatMoney(value: number | string | null | undefined): string {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

  trackFuncionario(_: number, funcionario: Funcionario): number | string {
    return funcionario.id ?? funcionario.cpf ?? funcionario.nomefuncionario;
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
    const categoria = String(this.form.value.categoria || '').toLowerCase().replace(/[\s_-]/g, '');
    if (this.categoriasExigemLoja.has(categoria) && !this.form.value.idloja) {
      const current = this.form.get('idloja')?.errors || {};
      this.form.get('idloja')?.setErrors({ ...current, required: true });
    }
    if (this.form.invalid) {
      this.openErrorOverlayIfNeeded();
      return;
    }

    // normalizações simples
    const raw = this.form.getRawValue();
    const payload: Funcionario = {
      ...raw,
      meta: raw.meta === '' || raw.meta === null ? 0 : Number(raw.meta),
      comissao_percentual: raw.comissao_percentual === '' || raw.comissao_percentual === null ? 0 : Number(raw.comissao_percentual),
      salario: raw.salario === '' || raw.salario === null ? 0 : Number(raw.salario),
      idloja: raw.idloja === '' ? null : raw.idloja,
      inicio: raw.inicio ? raw.inicio : null as any,
      fim: raw.fim ? raw.fim : null as any,
      cpf: raw.cpf ? String(raw.cpf) : null as any,
    };
    if (!this.podeVerSalario) {
      delete payload.salario;
    }

    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas.' : 'Funcionário criado.';
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

  excluir(item: Funcionario): void {
    if (!this.podeExcluirModulo) return;
    const id = (item as any).id;
    if (!id) return;
    this.excluirModal = item;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const item = this.excluirModal;
    const id = item ? (item as any).id : null;
    if (!id) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Funcionário excluído.';
        const eraUltimo = this.funcionarios.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: () => { this.errorMsg = 'Falha ao excluir.'; }
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  // Overlay de erros
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('nomefuncionario')?.hasError('required') || false, 'Nome é obrigatório.');
    P(f.get('nomefuncionario')?.hasError('maxlength') || false, 'Nome: máx. 50 caracteres.');
    P(f.get('apelido')?.hasError('maxlength') || false, 'Apelido: máx. 20 caracteres.');
    P(f.get('cpf')?.hasError('cpf') || false, 'CPF inválido.');
    P(f.get('categoria')?.hasError('maxlength') || false, 'Categoria: máx. 15 caracteres.');
    P(f.get('idloja')?.hasError('required') || false, 'Loja é obrigatória para este cargo.');

    ['nomefuncionario','apelido','cpf','inicio','fim','categoria','meta','comissao_percentual','salario','idloja','ativo']
      .forEach(field => {
        const err = f.get(field)?.errors?.['server'];
        if (err) msgs.push(`${field}: ${err}`);
      });

    return msgs;
  }

  openErrorOverlayIfNeeded(): void {
    this.errorOverlayOpen = this.getFormErrors().length > 0;
  }
  closeErrorOverlay(): void { this.errorOverlayOpen = false; }

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.funcionarios.pageSize'));
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
