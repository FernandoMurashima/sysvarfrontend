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
import { ClientesService } from '../../core/services/clientes.service';
import { Cliente } from '../../core/models/clientes';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent, SummaryCardComponent],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ClientesService);
  private auth = inject(AuthService);

  // ======== Estado geral UI ========
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
  filterTipo = '';
  filterCidade = '';
  filterStatus = '';
  filterEstado = '';
  filterCpf = '';
  filterEmail = '';
  advancedOpen = false;
  successMsg = '';
  errorMsg = '';
  excluirModal: Cliente | null = null;
  errorOverlayOpen = false;
  columnsOpen = false;
  exportOpen = false;
  private readonly columnsStorageKey = 'sysvar.list.clientes.columns';
  columns = [
    { key: 'apelido', label: 'Apelido', visible: true, required: false },
    { key: 'cpf', label: 'CPF', visible: true, required: false },
    { key: 'cidade', label: 'Cidade/UF', visible: true, required: false },
    { key: 'email', label: 'E-mail', visible: true, required: false },
    { key: 'telefone', label: 'Telefone', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
    { key: 'cadastro', label: 'Cadastro', visible: true, required: false },
  ];

  // ======== Formulário ========
  form: FormGroup = this.fb.group({
    nome_cliente: ['', [Validators.required, Validators.maxLength(50)]],
    apelido: ['', [Validators.maxLength(18)]],
    cpf: ['', [this.cpfValidator]],

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
    aniversario: [''],         // será convertido para null se vazio

    bloqueio: [false],
    mala_direta: [false],
    ativo: [true],
  });

  logradouroOptions: string[] = [
    'Rua','Avenida','Travessa','Alameda','Praça','Rodovia','Estrada','Largo','Viela'
  ];

  // ======== Lista + ListView (client-side) ========
  clientesAll: Cliente[] = [];
  clientes: Cliente[] = [];

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
    return this.clientesAll.flatMap(c => [
      c.nome_cliente,
      c.apelido,
      c.cpf,
      c.email,
      c.cidade,
      c.estado,
      c.telefone1,
    ].filter((v): v is string => !!v));
  }

  get indicadores() {
    const total = this.clientesAll.length;
    const ativos = this.clientesAll.filter(c => c.ativo !== false).length;
    const bloqueados = this.clientesAll.filter(c => !!c.bloqueio).length;
    const malaDireta = this.clientesAll.filter(c => !!c.mala_direta).length;
    const comCidade = this.clientesAll.filter(c => !!(c.cidade || '').trim()).length;
    return { total, ativos, bloqueados, malaDireta, comCidade };
  }

  get cidadesOptions(): string[] {
    return Array.from(new Set(
      this.clientesAll
        .map(c => (c.cidade || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get clientesFiltrados(): Cliente[] {
    const term = this.normalize(this.search);
    const tipo = this.filterTipo;
    const cidade = this.normalize(this.filterCidade);
    const status = this.filterStatus;
    const estado = this.normalize(this.filterEstado);
    const cpf = this.digits(this.filterCpf);
    const email = this.normalize(this.filterEmail);

    return this.clientesAll.filter(c => {
      const haystack = this.normalize([
        c.nome_cliente,
        c.apelido,
        c.cpf,
        c.email,
        c.cidade,
        c.estado,
        c.telefone1,
        c.telefone2,
      ].filter(Boolean).join(' '));
      const cpfCliente = this.digits(c.cpf || '');
      const tipoCliente = this.tipoCliente(c);

      if (term && !haystack.includes(term)) return false;
      if (tipo && tipoCliente !== tipo) return false;
      if (cidade && this.normalize(c.cidade || '') !== cidade) return false;
      if (status === 'ATIVO' && c.ativo === false) return false;
      if (status === 'INATIVO' && c.ativo !== false) return false;
      if (status === 'BLOQUEADO' && !c.bloqueio) return false;
      if (estado && this.normalize(c.estado || '') !== estado) return false;
      if (cpf && !cpfCliente.includes(cpf)) return false;
      if (email && !this.normalize(c.email || '').includes(email)) return false;
      return true;
    });
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.load();
  }

  // ========= Helpers de telefone =========

  /** Mantém só dígitos (até 11) */
  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '').slice(0, 11);
  }

  /** Formata dígitos em (99)-9999-9999 ou (99)-99999-9999 */
  formatPhone(digits: string): string {
    const d = this.onlyDigits(digits);
    if (d.length < 10) return d; // deixa como está enquanto digita
    const ddd = d.slice(0, 2);
    if (d.length === 10) {
      // fixo: 4+4
      return `(${ddd})-` + d.slice(2, 6) + '-' + d.slice(6, 10);
    }
    // móvel: 5+4
    return `(${ddd})-` + d.slice(2, 7) + '-' + d.slice(7, 11);
  }

  // ========= Validadores =========

  /** CPF: aceita vazio; se houver valor, exige 11 dígitos válidos com DV */
  cpfValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw = (ctrl.value || '').toString();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length !== 11) return { cpf: true };
    if (/^(\d)\1{10}$/.test(digits)) return { cpf: true };

    const calc = (base: string, facIni: number) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (facIni - i);
      const mod = sum % 11;
      return (mod < 2) ? 0 : 11 - mod;
    };
    const d1 = calc(digits.substring(0, 9), 10);
    const d2 = calc(digits.substring(0, 10), 11);
    const ok = digits === digits.substring(0, 9) + String(d1) + String(d2);
    return ok ? null : { cpf: true };
  }

  /** Telefone simples: valida máscara (99)-9999-9999 ou (99)-99999-9999 */
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

  // ========= Ações / Fluxo =========

  load(): void {
    this.loading = true;
    this.api.list({ page_size: 2000 }).subscribe({
      next: (res: any) => {
        const arr: Cliente[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.clientesAll = arr;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error(err);
        this.clientesAll = [];
        this.clientes = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar clientes.';
      }
    });
  }

  applyPage(): void {
    const filtered = this.clientesFiltrados;
    this.total = filtered.length;
    if (this.page > this.totalPages) this.page = this.totalPages;
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.clientes = filtered.slice(start, end);
  }

  onPageSizeChange(sizeStr: string): void {
    const size = Number(sizeStr) || 10;
    this.pageSize = size;
    localStorage.setItem('sysvar.list.clientes.pageSize', String(size));
    this.page = 1;
    this.applyPage();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.applyPage(); } }
  prevPage(): void  { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void  { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void  { if (this.page !== this.totalPages) { this.page = this.totalPages; this.applyPage(); } }

  // Buscar / limpar
  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }
  doSearch(): void {
    this.page = 1;
    this.applyPage();
  }
  clearSearch(): void {
    this.search = '';
    this.filterTipo = '';
    this.filterCidade = '';
    this.filterStatus = '';
    this.filterEstado = '';
    this.filterCpf = '';
    this.filterEmail = '';
    this.page = 1;
    this.applyPage();
  }

  // Novo / Editar
  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });

    this.form.reset({
      nome_cliente: '',
      apelido: '',
      cpf: '',
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
      aniversario: '',

      bloqueio: false,
      mala_direta: false,
      ativo: true,
    });
  }

  editar(row: Cliente): void {
    this.showForm = true;
    this.editingId = row.id ?? null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });

    // Formatar telefones vindos como dígitos do backend
    const t1 = this.formatPhone(row.telefone1 ?? '');
    const t2 = this.formatPhone(row.telefone2 ?? '');

    this.form.reset({
      nome_cliente:   row.nome_cliente ?? '',
      apelido:        row.apelido ?? '',
      cpf:            row.cpf ?? '',
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
      aniversario:    row.aniversario ?? '',

      bloqueio:       !!row.bloqueio,
      mala_direta:    !!row.mala_direta,
      ativo:          row.ativo ?? true,
    });
  }

  consultar(row: Cliente): void {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  rowActions(row: Cliente): RowAction[] {
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo, danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string, row: Cliente): void {
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
    const headers = ['Cliente', 'Apelido', 'CPF', 'Cidade/UF', 'Email', 'Telefone', 'Status', 'Cadastro'];
    const body = this.clientesFiltrados.map(c => [
      c.nome_cliente,
      c.apelido || '',
      this.formatCpf(c.cpf),
      this.cidadeUf(c),
      c.email || '',
      this.formatPhone(c.telefone1 || ''),
      c.ativo === false ? 'Inativo' : 'Ativo',
      this.formatDate(c.data_cadastro),
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clientes.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.exportOpen = false;
  }

  cidadeUf(cliente: Cliente): string {
    const cidade = (cliente.cidade || '').trim();
    const uf = (cliente.estado || '').trim().toUpperCase();
    if (cidade && uf) return `${cidade}/${uf}`;
    return cidade || uf || '-';
  }

  percentual(valor: number): string {
    const total = this.indicadores.total || 0;
    if (!total) return '0% do total';
    return `${((valor / total) * 100).toFixed(0)}% do total`;
  }

  tipoCliente(cliente: Cliente): 'CONSUMIDOR' | 'PJ' | 'PF' {
    const nome = this.normalize(`${cliente.nome_cliente || ''} ${cliente.apelido || ''}`);
    if (nome.includes('consumidor')) return 'CONSUMIDOR';
    return this.digits(cliente.cpf || '').length > 11 ? 'PJ' : 'PF';
  }

  tipoClienteLabel(cliente: Cliente): string {
    const tipo = this.tipoCliente(cliente);
    if (tipo === 'CONSUMIDOR') return 'Consumidor final';
    return tipo === 'PJ' ? 'Pessoa jurídica' : 'Pessoa física';
  }

  private normalize(value: string): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private digits(value: string): string {
    return (value || '').replace(/\D/g, '');
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

  trackCliente(_: number, cliente: Cliente): number | string {
    return cliente.id ?? cliente.cpf ?? cliente.nome_cliente;
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

    // Remover máscara antes de enviar (backend espera só dígitos)
    const payload: Cliente = {
      ...raw,
      telefone1: this.onlyDigits(raw.telefone1),
      telefone2: this.onlyDigits(raw.telefone2),
      aniversario: raw.aniversario ? raw.aniversario : null,
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
          : 'Cliente criado com sucesso.';
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

  excluir(item: Cliente): void {
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
        this.successMsg = 'Cliente excluído.';
        const eraUltimo = this.clientes.length === 1 && this.page > 1;
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

    P(f.get('nome_cliente')?.hasError('required') || false, 'Nome do cliente é obrigatório.');
    P(f.get('nome_cliente')?.hasError('maxlength') || false, 'Nome do cliente: máx. 50 caracteres.');

    P(f.get('apelido')?.hasError('maxlength') || false, 'Apelido: máx. 18 caracteres.');

    P(f.get('cpf')?.hasError('cpf') || false, 'CPF inválido.');
    P(f.get('email')?.hasError('email') || false, 'Email inválido.');

    P(f.get('numero')?.hasError('maxlength') || false, 'Número: máx. 10 caracteres.');

    P(f.get('telefone1')?.hasError('phone') || false, 'Telefone 1: formato (99)-9999-9999 ou (99)-99999-9999.');
    P(f.get('telefone2')?.hasError('phone') || false, 'Telefone 2: formato (99)-9999-9999 ou (99)-99999-9999.');

    // erros vindos do backend
    [
      'nome_cliente','apelido','cpf','email',
      'logradouro','endereco','numero','complemento',
      'cep','bairro','cidade','estado',
      'telefone1','telefone2',
      'categoria','aniversario',
      'bloqueio','mala_direta','ativo',
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
    const size = Number(localStorage.getItem('sysvar.list.clientes.pageSize'));
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
