import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
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
import { Subscription } from 'rxjs';
import { ClientesService } from '../../core/services/clientes.service';
import { Cliente, ClienteIndicadores } from '../../core/models/clientes';
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
export class ClientesComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private api = inject(ClientesService);
  private auth = inject(AuthService);
  private tipoPessoaSub?: Subscription;

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
  selectedCliente: Cliente | null = null;
  indicatorsVisible = true;
  filtersVisible = true;
  private readonly columnsStorageKey = 'sysvar.list.clientes.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.clientes';
  columns = [
    { key: 'apelido', label: 'Apelido', visible: true, required: false },
    { key: 'documento', label: 'Documento', visible: true, required: false },
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
    tipo_pessoa: ['PF', [Validators.required]],
    documento: ['', [this.documentoValidator]],

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
    aceita_email: [false],
    aceita_whatsapp: [false],
    aceita_sms: [false],
    origem_consentimento: [''],
    consentimento_observacao: [''],
    ativo: [true],
  });

  logradouroOptions: string[] = [
    'Rua','Avenida','Travessa','Alameda','Praça','Rodovia','Estrada','Largo','Viela'
  ];

  clientes: Cliente[] = [];
  indicadoresData: ClienteIndicadores = {
    total: 0,
    ativos: 0,
    inativos: 0,
    bloqueados: 0,
    pessoas_fisicas: 0,
    pessoas_juridicas: 0,
    clientes_identificados: 0,
    cliente_padrao: 0,
    com_consentimento: 0,
    clientes_com_compras: 0,
    clientes_sem_compras: 0,
  };

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
    return this.clientes.flatMap(c => [
      c.nome_cliente,
      c.apelido,
      c.documento || c.cpf,
      c.email,
      c.cidade,
      c.estado,
      c.telefone1,
    ].filter((v): v is string => !!v));
  }

  get indicadores() {
    return {
      total: this.indicadoresData.total || 0,
      ativos: this.indicadoresData.ativos || 0,
      bloqueados: this.indicadoresData.bloqueados || 0,
      malaDireta: this.indicadoresData.com_consentimento || 0,
      comCidade: this.clientes.filter(c => !!(c.cidade || '').trim()).length,
    };
  }

  get cidadesOptions(): string[] {
    return Array.from(new Set(
      this.clientes
        .map(c => (c.cidade || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get clientesFiltrados(): Cliente[] { return this.clientes; }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.tipoPessoaSub = this.form.get('tipo_pessoa')?.valueChanges.subscribe(() => {
      this.form.get('documento')?.updateValueAndValidity({ onlySelf: true });
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.tipoPessoaSub?.unsubscribe();
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

  documentoValidator(ctrl: AbstractControl): ValidationErrors | null {
    const group = ctrl.parent;
    const tipo = group?.get('tipo_pessoa')?.value || 'PF';
    const digits = String(ctrl.value || '').replace(/\D/g, '');
    if (!digits) return null;
    if (tipo === 'PJ') return ClientesComponent.cnpjValido(digits) ? null : { documento: true };
    return ClientesComponent.cpfValido(digits) ? null : { documento: true };
  }

  private static cpfValido(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
    const calc = (base: string, facIni: number) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (facIni - i);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const d1 = calc(digits.substring(0, 9), 10);
    const d2 = calc(digits.substring(0, 10), 11);
    return digits === digits.substring(0, 9) + String(d1) + String(d2);
  }

  private static cnpjValido(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
    const calc = (base: string, weights: number[]) => {
      const sum = base.split('').reduce((acc, digit, idx) => acc + parseInt(digit, 10) * weights[idx], 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const d1 = calc(digits.substring(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = calc(digits.substring(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return digits.endsWith(`${d1}${d2}`);
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
    const params = this.currentParams();
    this.api.indicadores(params).subscribe({
      next: indicadores => this.indicadoresData = indicadores,
      error: () => this.indicadoresData = { ...this.indicadoresData, total: 0 }
    });
    this.api.list(params).subscribe({
      next: (res) => {
        this.clientes = res.results ?? [];
        this.total = res.count ?? 0;
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error(err);
        this.clientes = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar clientes.';
      }
    });
  }

  applyPage(): void {
    if (this.page > this.totalPages) this.page = this.totalPages;
    if (this.selectedCliente && !this.clientes.some(c => c.id === this.selectedCliente?.id)) {
      this.selectedCliente = null;
    }
  }

  onDocumentoInput(): void {
    const ctrl = this.form.get('documento');
    if (!ctrl) return;
    const tipo = this.form.get('tipo_pessoa')?.value === 'PJ' ? 'PJ' : 'PF';
    ctrl.setValue(this.formatDocumentoInput(ctrl.value, tipo), { emitEvent: false });
    ctrl.updateValueAndValidity({ onlySelf: true });
  }

  formatDocumentoInput(value: string | null | undefined, tipo: 'PF' | 'PJ' = 'PF'): string {
    const limit = tipo === 'PJ' ? 14 : 11;
    const d = this.digits(value || '').slice(0, limit);
    if (tipo === 'PJ') {
      if (d.length <= 2) return d;
      if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
      if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
      if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    }
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  onPageSizeChange(sizeStr: string): void {
    const size = Number(sizeStr) || 10;
    this.pageSize = size;
    localStorage.setItem('sysvar.list.clientes.pageSize', String(size));
    this.page = 1;
    this.load();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.load(); } }
  prevPage(): void  { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void  { if (this.page < this.totalPages) { this.page++; this.load(); } }
  lastPage(): void  { if (this.page !== this.totalPages) { this.page = this.totalPages; this.load(); } }

  // Buscar / limpar
  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }
  doSearch(): void {
    this.page = 1;
    this.load();
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
    this.load();
  }

  private currentParams() {
    const ativo = this.filterStatus === 'ATIVO' ? 'true' : this.filterStatus === 'INATIVO' ? 'false' : '';
    const bloqueio = this.filterStatus === 'BLOQUEADO' ? 'true' : '';
    return {
      search: this.search,
      page: this.page,
      page_size: this.pageSize,
      tipo_pessoa: this.filterTipo,
      cidade: this.filterCidade,
      ativo,
      bloqueio,
      estado: this.filterEstado.trim().toUpperCase(),
      documento: this.digits(this.filterCpf),
      email: this.filterEmail.trim().toLowerCase(),
    };
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
      tipo_pessoa: 'PF',
      documento: '',
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
      aceita_email: false,
      aceita_whatsapp: false,
      aceita_sms: false,
      origem_consentimento: '',
      consentimento_observacao: '',
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
      tipo_pessoa:    row.tipo_pessoa ?? 'PF',
      documento:      row.documento ?? row.cpf ?? '',
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
      aceita_email:   !!row.aceita_email,
      aceita_whatsapp: !!row.aceita_whatsapp,
      aceita_sms:     !!row.aceita_sms,
      origem_consentimento: row.origem_consentimento ?? '',
      consentimento_observacao: row.consentimento_observacao ?? '',
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
      { key: 'ativar', label: 'Ativar', icon: '✓', visible: this.podeEditarModulo && row.ativo === false },
      { key: 'inativar', label: 'Inativar', icon: '−', visible: this.podeEditarModulo && row.ativo !== false && !row.cliente_padrao },
      { key: 'bloquear', label: 'Bloquear', icon: '!', visible: this.podeEditarModulo && !row.bloqueio && !row.cliente_padrao },
      { key: 'desbloquear', label: 'Desbloquear', icon: '✓', visible: this.podeEditarModulo && !!row.bloqueio },
      { key: 'excluir', label: 'Excluir', icon: '⌫', visible: this.podeExcluirModulo && !row.cliente_padrao, danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string, row: Cliente): void {
    if (action === 'consultar') this.consultar(row);
    if (action === 'editar') this.editar(row);
    if (action === 'ativar') this.executarCiclo(row, 'ativar');
    if (action === 'inativar') this.executarCiclo(row, 'inativar');
    if (action === 'bloquear') this.bloquear(row);
    if (action === 'desbloquear') this.executarCiclo(row, 'desbloquear');
    if (action === 'excluir') this.excluir(row);
  }

  executarCiclo(row: Cliente, action: 'ativar' | 'inativar' | 'desbloquear'): void {
    const id = row.id;
    if (!id || !this.podeEditarModulo) return;
    this.api[action](id).subscribe({
      next: () => {
        this.successMsg = 'Cliente atualizado.';
        this.load();
      },
      error: err => this.errorMsg = err?.error?.detail || 'Falha ao atualizar cliente.'
    });
  }

  bloquear(row: Cliente): void {
    const id = row.id;
    if (!id || !this.podeEditarModulo) return;
    const motivo = window.prompt('Motivo do bloqueio');
    if (!motivo) return;
    this.api.bloquear(id, { motivo }).subscribe({
      next: () => {
        this.successMsg = 'Cliente bloqueado.';
        this.load();
      },
      error: err => this.errorMsg = err?.error?.detail || 'Falha ao bloquear cliente.'
    });
  }

  selecionarCliente(row: Cliente): void {
    this.selectedCliente = this.isSelected(row) ? null : row;
  }

  isSelected(row: Cliente): boolean {
    return !!this.selectedCliente && this.selectedCliente.id === row.id;
  }

  consultarSelecionado(): void {
    if (this.selectedCliente) this.consultar(this.selectedCliente);
  }

  editarSelecionado(): void {
    if (this.selectedCliente && this.podeEditarModulo) this.editar(this.selectedCliente);
  }

  excluirSelecionado(): void {
    if (this.selectedCliente && this.podeExcluirModulo && !this.selectedCliente.cliente_padrao) this.excluir(this.selectedCliente);
  }

  toggleIndicators(): void {
    this.indicatorsVisible = !this.indicatorsVisible;
    this.saveViewPreference();
  }

  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
    this.saveViewPreference();
  }

  restoreViewPreference(): void {
    localStorage.removeItem(this.viewPrefsKey);
    localStorage.removeItem('sysvar.list.clientes.pageSize');
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.pageSize = 20;
    this.columns = this.columns.map(c => ({ ...c, visible: true }));
    this.saveColumnsPreference();
    this.load();
  }

  @HostListener('window:sysvar-clientes-toggle-indicators')
  onToggleIndicatorsEvent(): void {
    this.toggleIndicators();
  }

  @HostListener('window:sysvar-clientes-toggle-filters')
  onToggleFiltersEvent(): void {
    this.toggleFilters();
  }

  @HostListener('window:sysvar-clientes-restore-view')
  onRestoreViewEvent(): void {
    this.restoreViewPreference();
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
    const headers = ['Cliente', 'Apelido', 'Documento', 'Cidade/UF', 'Email', 'Telefone', 'Status', 'Cadastro'];
    const body = this.clientesFiltrados.map(c => [
      c.nome_cliente,
      c.apelido || '',
      this.formatDocumento(c),
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
    if (cliente.cliente_padrao) return 'CONSUMIDOR';
    return cliente.tipo_pessoa === 'PJ' ? 'PJ' : 'PF';
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

  formatCnpj(value?: string | null): string {
    const d = (value || '').replace(/\D/g, '').slice(0, 14);
    if (d.length !== 14) return value || '-';
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`;
  }

  formatDocumento(cliente: Cliente): string {
    const value = cliente.documento || cliente.cpf || '';
    return cliente.tipo_pessoa === 'PJ' ? this.formatCnpj(value) : this.formatCpf(value);
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  trackCliente(_: number, cliente: Cliente): number | string {
    return cliente.id ?? cliente.documento ?? cliente.cpf ?? cliente.nome_cliente;
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
      documento: this.digits(raw.documento || ''),
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
            const ctrl = this.form.get(field === 'cpf' ? 'documento' : field);
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

    P(f.get('documento')?.hasError('documento') || false, 'Documento inválido.');
    P(f.get('email')?.hasError('email') || false, 'Email inválido.');

    P(f.get('numero')?.hasError('maxlength') || false, 'Número: máx. 10 caracteres.');

    P(f.get('telefone1')?.hasError('phone') || false, 'Telefone 1: formato (99)-9999-9999 ou (99)-99999-9999.');
    P(f.get('telefone2')?.hasError('phone') || false, 'Telefone 2: formato (99)-9999-9999 ou (99)-99999-9999.');

    // erros vindos do backend
    [
      'nome_cliente','apelido','tipo_pessoa','documento','email',
      'logradouro','endereco','numero','complemento',
      'cep','bairro','cidade','estado',
      'telefone1','telefone2',
      'categoria','aniversario',
      'bloqueio','mala_direta','aceita_email','aceita_whatsapp','aceita_sms','ativo',
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

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try {
      const pref = JSON.parse(raw) as { indicatorsVisible?: boolean; filtersVisible?: boolean };
      this.indicatorsVisible = pref.indicatorsVisible ?? true;
      this.filtersVisible = pref.filtersVisible ?? true;
    } catch {
      return;
    }
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({
      indicatorsVisible: this.indicatorsVisible,
      filtersVisible: this.filtersVisible,
    }));
  }
}
