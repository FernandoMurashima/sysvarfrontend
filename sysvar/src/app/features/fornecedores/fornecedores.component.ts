import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormGroup
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { Fornecedor } from '../../core/models/fornecedor';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';

@Component({
  selector: 'app-fornecedores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent, SummaryCardComponent],
  templateUrl: './fornecedores.component.html',
  styleUrls: ['./fornecedores.component.css']
})
export class FornecedoresComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FornecedoresService);
  private auth = inject(AuthService);

  // ======== Estado UI ========
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
  filterCategoria = '';
  filterCidade = '';
  filterStatus = '';
  filterEstado = '';
  filterCnpj = '';
  filterEmail = '';
  advancedOpen = false;
  successMsg = '';
  errorMsg = '';
  excluirModal: Fornecedor | null = null;
  errorOverlayOpen = false;
  columnsOpen = false;
  exportOpen = false;
  private readonly columnsStorageKey = 'sysvar.list.fornecedores.columns';
  columns = [
    { key: 'apelido', label: 'Apelido', visible: true, required: false },
    { key: 'categoria', label: 'Categoria', visible: true, required: false },
    { key: 'cnpj', label: 'CNPJ', visible: true, required: false },
    { key: 'cidade', label: 'Cidade/UF', visible: true, required: false },
    { key: 'email', label: 'E-mail', visible: true, required: false },
    { key: 'telefone', label: 'Telefone', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];

  // ======== Form ========
  form: FormGroup = this.fb.group({
    nome_fornecedor: ['', [Validators.required, Validators.maxLength(50)]],
    apelido: ['', [Validators.maxLength(18)]],
    cnpj: ['', [Validators.required, this.cnpjValidator]],
    email: ['', [Validators.email]],

    logradouro: ['Rua'],
    endereco: [''],
    numero: ['', [Validators.maxLength(10)]],
    complemento: [''],

    cep: [''],
    bairro: [''],
    cidade: [''],
    estado: [''],

    telefone1: ['', [this.phoneValidator]],
    telefone2: ['', [this.phoneValidator]],

    categoria: [''],
    bloqueio: [false],
    mala_direta: [false],

    ativo: [true],
  });

  categoriaOptions = [
    { value: 'MATERIA_PRIMA', label: 'Matéria-prima' },
    { value: 'AVIAMENTO', label: 'Aviamento' },
    { value: 'REVENDA', label: 'Produto de revenda' },
    { value: 'FACCAO', label: 'Facção' },
    { value: 'PRESTADOR', label: 'Prestador de serviço' },
    { value: 'TRANSPORTADORA', label: 'Transportadora' },
    { value: 'OUTROS', label: 'Outros' },
  ];

  logradouroOptions: string[] = [
    'Rua','Avenida','Travessa','Alameda','Praça','Rodovia','Estrada','Largo','Viela'
  ];

  categoriaLabel(value?: string | null): string {
    if (!value) return '';
    return this.categoriaOptions.find(opt => opt.value === value)?.label || value;
  }

  // ======== Lista + paginação client-side ========
  fornecedoresAll: Fornecedor[] = [];
  fornecedores: Fornecedor[] = [];

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
    return this.fornecedoresAll.flatMap(f => [
      f.nome_fornecedor,
      f.apelido,
      f.cnpj,
      f.email,
      f.cidade,
      f.estado,
      this.categoriaLabel(f.categoria),
    ].filter((v): v is string => !!v));
  }

  get indicadores() {
    const total = this.fornecedoresAll.length;
    const ativos = this.fornecedoresAll.filter(f => f.ativo !== false).length;
    const faccoes = this.fornecedoresAll.filter(f => f.categoria === 'FACCAO').length;
    const bloqueados = this.fornecedoresAll.filter(f => !!f.bloqueio).length;
    const comCidade = this.fornecedoresAll.filter(f => !!(f.cidade || '').trim()).length;
    return { total, ativos, faccoes, bloqueados, comCidade };
  }

  get cidadesOptions(): string[] {
    return Array.from(new Set(
      this.fornecedoresAll
        .map(f => (f.cidade || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get fornecedoresFiltrados(): Fornecedor[] {
    const term = this.normalize(this.search);
    const categoria = this.filterCategoria;
    const cidade = this.normalize(this.filterCidade);
    const status = this.filterStatus;
    const estado = this.normalize(this.filterEstado);
    const cnpj = this.onlyDigits(this.filterCnpj);
    const email = this.normalize(this.filterEmail);

    return this.fornecedoresAll.filter(f => {
      const haystack = this.normalize([
        f.nome_fornecedor,
        f.apelido,
        f.cnpj,
        f.email,
        f.cidade,
        f.estado,
        f.telefone1,
        f.telefone2,
        this.categoriaLabel(f.categoria),
      ].filter(Boolean).join(' '));

      if (term && !haystack.includes(term)) return false;
      if (categoria && f.categoria !== categoria) return false;
      if (cidade && this.normalize(f.cidade || '') !== cidade) return false;
      if (status === 'ATIVO' && f.ativo === false) return false;
      if (status === 'INATIVO' && f.ativo !== false) return false;
      if (status === 'BLOQUEADO' && !f.bloqueio) return false;
      if (estado && this.normalize(f.estado || '') !== estado) return false;
      if (cnpj && !this.onlyDigits(f.cnpj || '').includes(cnpj)) return false;
      if (email && !this.normalize(f.email || '').includes(email)) return false;
      return true;
    });
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.load();
  }

  // ========= Helpers =========
  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  formatPhone(digits: string): string {
    const d = this.onlyDigits(digits).slice(0, 11);
    if (d.length < 10) return d;
    const ddd = d.slice(0, 2);
    if (d.length === 10) {
      return `(${ddd})-` + d.slice(2, 6) + '-' + d.slice(6, 10);
    }
    return `(${ddd})-` + d.slice(2, 7) + '-' + d.slice(7, 11);
    }

  // ========= Validadores =========
  cnpjValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw: string = (ctrl.value || '').toString();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null; // required cuida do vazio
    if (digits.length !== 14) return { cnpj: true };
    if (/^(\d)\1{13}$/.test(digits)) return { cnpj: true };
    const calc = (base: string, factors: number[]) => {
      const sum = base.split('')
        .map((n, i) => parseInt(n, 10) * factors[i])
        .reduce((a, b) => a + b, 0);
      const mod = sum % 11;
      return (mod < 2) ? 0 : 11 - mod;
    };
    const base12 = digits.slice(0, 12);
    const d1 = calc(base12, [5,4,3,2,9,8,7,6,5,4,3,2]);
    const base13 = base12 + d1;
    const d2 = calc(base13, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
    const ok = digits === (base12 + String(d1) + String(d2));
    return ok ? null : { cnpj: true };
  }

  phoneValidator(ctrl: AbstractControl): ValidationErrors | null {
    const v: string = (ctrl.value || '').toString().trim();
    if (!v) return null;
    const ok = /^\(\d{2}\)-\d{4,5}-\d{4}$/.test(v);
    return ok ? null : { phone: true };
  }

  onPhoneInput(field: 'telefone1'|'telefone2'): void {
    const ctrl = this.form.get(field);
    if (!ctrl) return;
    const masked = this.formatPhone(ctrl.value);
    ctrl.setValue(masked, { emitEvent: false });
  }

  // ========= Fluxo =========
  load(): void {
    this.loading = true;
    this.api.list({ page_size: 2000 }).subscribe({
      next: (res: any) => {
        const arr: Fornecedor[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.fornecedoresAll = arr;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error(err);
        this.fornecedoresAll = [];
        this.fornecedores = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar fornecedores.';
      }
    });
  }

  applyPage(): void {
    const filtered = this.fornecedoresFiltrados;
    this.total = filtered.length;
    if (this.page > this.totalPages) this.page = this.totalPages;
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.fornecedores = filtered.slice(start, end);
  }

  onPageSizeChange(sizeStr: string): void {
    const size = Number(sizeStr) || 10;
    this.pageSize = size;
    localStorage.setItem('sysvar.list.fornecedores.pageSize', String(size));
    this.page = 1;
    this.applyPage();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.applyPage(); } }
  prevPage(): void  { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void  { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void  { if (this.page !== this.totalPages) { this.page = this.totalPages; this.applyPage(); } }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }
  doSearch(): void {
    this.page = 1;
    this.applyPage();
  }
  clearSearch(): void {
    this.search = '';
    this.filterCategoria = '';
    this.filterCidade = '';
    this.filterStatus = '';
    this.filterEstado = '';
    this.filterCnpj = '';
    this.filterEmail = '';
    this.page = 1;
    this.applyPage();
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
      nome_fornecedor: '',
      apelido: '',
      cnpj: '',
      email: '',

      logradouro: 'Rua',
      endereco: '',
      numero: '',
      complemento: '',

      cep: '',
      bairro: '',
      cidade: '',
      estado: '',

      telefone1: '',
      telefone2: '',

      categoria: '',
      bloqueio: false,
      mala_direta: false,

      ativo: true,
    });
  }

  editar(row: Fornecedor): void {
    this.showForm = true;
    this.editingId = row.id ?? null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });

    const t1 = this.formatPhone(row.telefone1 ?? '');
    const t2 = this.formatPhone(row.telefone2 ?? '');

    this.form.reset({
      nome_fornecedor: row.nome_fornecedor ?? '',
      apelido:        row.apelido ?? '',
      cnpj:           row.cnpj ?? '',
      email:          row.email ?? '',

      logradouro:     row.logradouro ?? 'Rua',
      endereco:       row.endereco ?? '',
      numero:         row.numero ?? '',
      complemento:    row.complemento ?? '',

      cep:            row.cep ?? '',
      bairro:         row.bairro ?? '',
      cidade:         row.cidade ?? '',
      estado:         row.estado ?? '',

      telefone1:      t1,
      telefone2:      t2,

      categoria:      row.categoria ?? '',
      bloqueio:       !!row.bloqueio,
      mala_direta:    !!row.mala_direta,

      ativo:          row.ativo ?? true,
    });
  }

  consultar(row: Fornecedor): void {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  rowActions(row: Fornecedor): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string, row: Fornecedor): void {
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
    const headers = ['Fornecedor', 'Apelido', 'Categoria', 'CNPJ', 'Cidade/UF', 'Email', 'Telefone', 'Status'];
    const body = this.fornecedoresFiltrados.map(f => [
      f.nome_fornecedor,
      f.apelido || '',
      this.categoriaLabel(f.categoria),
      this.formatCnpj(f.cnpj),
      this.cidadeUf(f),
      f.email || '',
      this.formatPhone(f.telefone1 || ''),
      f.ativo === false ? 'Inativo' : 'Ativo',
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fornecedores.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.exportOpen = false;
  }

  cidadeUf(fornecedor: Fornecedor): string {
    const cidade = (fornecedor.cidade || '').trim();
    const uf = (fornecedor.estado || '').trim().toUpperCase();
    if (cidade && uf) return `${cidade}/${uf}`;
    return cidade || uf || '-';
  }

  formatCnpj(value?: string | null): string {
    const d = (value || '').replace(/\D/g, '').slice(0, 14);
    if (d.length !== 14) return value || '-';
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`;
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

  trackFornecedor(_: number, fornecedor: Fornecedor): number | string {
    return fornecedor.id ?? fornecedor.cnpj ?? fornecedor.nome_fornecedor;
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

    const raw = this.form.value;

    const payload: Fornecedor = {
      ...raw,
      cnpj: this.onlyDigits(raw.cnpj),
      telefone1: this.onlyDigits(raw.telefone1),
      telefone2: this.onlyDigits(raw.telefone2),
    };

    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId
          ? 'Alterações salvas com sucesso.'
          : 'Fornecedor criado com sucesso.';
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

  excluir(item: Fornecedor): void {
    if (!this.podeExcluirModulo) return;
    const id = item.id;
    if (!id) return;
    this.excluirModal = item;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const item = this.excluirModal;
    const id = item?.id;
    if (!id) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Fornecedor excluído.';
        const eraUltimo = this.fornecedores.length === 1 && this.page > 1;
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

  // ========= Overlay de erros =========
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('nome_fornecedor')?.hasError('required') || false, 'Nome do fornecedor é obrigatório.');
    P(f.get('nome_fornecedor')?.hasError('maxlength') || false, 'Nome do fornecedor: máx. 50 caracteres.');

    P(f.get('apelido')?.hasError('maxlength') || false, 'Apelido: máx. 18 caracteres.');

    P(f.get('cnpj')?.hasError('required') || false, 'CNPJ é obrigatório.');
    P(f.get('cnpj')?.hasError('cnpj') || false, 'CNPJ inválido.');

    P(f.get('email')?.hasError('email') || false, 'Email inválido.');
    P(f.get('numero')?.hasError('maxlength') || false, 'Número: máx. 10 caracteres.');

    P(f.get('telefone1')?.hasError('phone') || false, 'Telefone 1: formato (99)-9999-9999 ou (99)-99999-9999.');
    P(f.get('telefone2')?.hasError('phone') || false, 'Telefone 2: formato (99)-9999-9999 ou (99)-99999-9999.');

    // erros do backend
    [
      'nome_fornecedor','apelido','cnpj','email',
      'logradouro','endereco','numero','complemento',
      'cep','bairro','cidade','estado',
      'telefone1','telefone2',
      'categoria','bloqueio','mala_direta',
      'ativo'
    ].forEach(field => {
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

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.fornecedores.pageSize'));
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
