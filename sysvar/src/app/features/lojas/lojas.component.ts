import { Component, HostListener, OnInit, inject } from '@angular/core';
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
import { AuthService } from '../../core/auth.service';
import { LojasService } from '../../core/services/lojas.service';
import { EmpresasService } from '../../core/services/empresas.service';
import { Loja } from '../../core/models/loja';
import { Empresa } from '../../core/models/empresa';
import { User } from '../../core/models/user';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { ListPaginationComponent } from '../../shared/components/list-pagination/list-pagination.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-lojas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    SearchSuggestComponent,
    PageHeaderComponent,
    SummaryCardComponent,
    StatusBadgeComponent,
    RowActionsMenuComponent,
    ListPaginationComponent,
    EmptyStateComponent
  ],
  templateUrl: './lojas.component.html',
  styleUrls: ['./lojas.component.css']
})
export class LojasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api = inject(LojasService);
  private empresasApi = inject(EmpresasService);

  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;
  consultando = false;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('operacional', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('operacional');
  }

  search = '';
  successMsg = '';
  errorMsg = '';
  excluirModal: Loja | null = null;
  consultaModal: Loja | null = null;
  inativarModal: Loja | null = null;
  reativarModal: Loja | null = null;
  encerrarModal: Loja | null = null;
  encerramentoData = '';
  encerramentoMotivo = '';
  historicoModal: Loja | null = null;
  errorOverlayOpen = false;
  advancedOpen = false;
  columnsOpen = false;
  exportOpen = false;
  selectedLoja: Loja | null = null;
  indicatorsVisible = true;
  filtersVisible = true;
  filterEmpresa: number | '' = '';
  filterTipo = '';
  filterCidade = '';
  filterEstado = '';
  filterStatus = '';
  filterCnpj = '';
  sortKey: 'nome' | 'empresa' | 'tipo' | 'cidade' | 'status' | 'data' = 'nome';
  sortDir: 'asc' | 'desc' = 'asc';
  private readonly columnsStorageKey = 'sysvar.list.lojas.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.lojas';
  columns = [
    { key: 'empresa', label: 'Empresa', visible: true, required: false },
    { key: 'tipo', label: 'Tipo', visible: true, required: false },
    { key: 'apelido', label: 'Apelido', visible: true, required: false },
    { key: 'cnpj', label: 'CNPJ', visible: true, required: false },
    { key: 'cidade', label: 'Cidade/UF', visible: true, required: false },
    { key: 'email', label: 'E-mail', visible: true, required: false },
    { key: 'telefone', label: 'Telefone', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
    { key: 'data', label: 'Cadastro', visible: true, required: false },
  ];

  form: FormGroup = this.fb.group({
    empresa: [null, [Validators.required]],
    nome_loja: ['', [Validators.required, Validators.maxLength(50)]],
    apelido_loja: ['', [Validators.required, Validators.maxLength(20)]],
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

    // novos no form (mantemos nomes já usados no HTML)
    DataAbertura: [''],
    DataEnceramento: [''],
    EstoqueNegativo: ['NAO'],
    Rede: ['NAO'],
    Matriz: ['NAO'],
    tipo_unidade: ['LOJA'],
    regime_tributario: ['SIMPLES'],
    ambiente_fiscal: ['HOMOLOGACAO'],
    inscricao_estadual: ['', [Validators.maxLength(20)]],
    serie_nfce: [1, [Validators.min(1)]],
    proximo_numero_nfce: [1, [Validators.min(1)]],
    serie_nfe: [1, [Validators.min(1)]],
    proximo_numero_nfe: [1, [Validators.min(1)]],
    emite_nfce: [true],
    emite_nfe: [true],
  });

  logradouroOptions: string[] = [
    'Rua','Avenida','Travessa','Alameda','Praça','Rodovia','Estrada','Largo','Viela'
  ];

  lojasAll: Loja[] = [];
  lojas: Loja[] = [];
  empresas: Empresa[] = [];
  usuarioAtual: User | null = null;
  indicadoresApi = { total: 0, ativos: 0, inativos: 0, lojas: 0, matrizes: 0, fabricas: 0 };

  page = 1;
  pageSize = 20;
  pageSizeOptions = [20, 50, 100];
  total = 0;

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { if (this.total === 0) return 0; return (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }
  get isSuperUsuario(): boolean { return this.usuarioAtual?.is_superuser === true; }
  get empresaBloqueada(): boolean { return !!this.usuarioAtual && !this.isSuperUsuario; }
  get searchSuggestions(): string[] {
    return this.lojasAll.flatMap(l => [
      l.nome_loja,
      l.apelido_loja,
      l.cnpj,
      l.email,
      l.cidade,
      this.empresaLabel(l),
      this.tipoUnidadeLabel(l.tipo_unidade),
    ].filter((v): v is string => !!v));
  }

  get lojasFiltradas(): Loja[] {
    return this.lojasAll.filter(l => this.matchesFilters(l)).sort((a, b) => this.compareLojas(a, b));
  }

  get cidadesOptions(): string[] {
    return Array.from(new Set(this.lojasAll.map(l => (l.cidade || '').trim()).filter(Boolean))).sort();
  }

  get indicadores() {
    return {
      total: this.indicadoresApi.total,
      ativas: this.indicadoresApi.ativos,
      fabricas: this.indicadoresApi.fabricas,
      matrizes: this.indicadoresApi.matrizes,
      filiais: this.indicadoresApi.lojas,
    };
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.loadUsuarioAtual();
    this.load();
  }

  // ===== Helpers =====
  formatPhone(v?: string | null): string {
    const d = (v || '').replace(/\D/g, '').slice(0, 11);
    if (!d) return '';
    const ddd = d.slice(0, 2);
    const rest = d.slice(2);
    if (rest.length <= 8) {
      const p1 = rest.slice(0, Math.min(4, rest.length));
      const p2 = rest.slice(4, 8);
      return p2 ? `(${ddd})-${p1}-${p2}` : `(${ddd})-${p1}`;
    } else {
      const p1 = rest.slice(0, 5);
      const p2 = rest.slice(5, 9);
      return p2 ? `(${ddd})-${p1}-${p2}` : `(${ddd})-${p1}`;
    }
  }

  private blankToNull<T extends string | null | undefined>(v: T): string | null {
    const s = (v ?? '').toString().trim();
    return s === '' ? null : s;
  }

  // ====== Validators ======
  cnpjValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw: string = (ctrl.value || '').toString();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length !== 14) return { cnpj: true };
    if (/^(\d)\1{13}$/.test(digits)) return { cnpj: true };
    const calc = (base: string, factors: number[]) => {
      const sum = base.split('').map((n, i) => parseInt(n, 10) * factors[i]).reduce((a, b) => a + b, 0);
      const mod = sum % 11;
      return (mod < 2) ? 0 : 11 - mod;
    };
    const base12 = digits.slice(0, 12);
    const d1 = calc(base12, [5,4,3,2,9,8,7,6,5,4,3,2]);
    const base13 = base12 + d1;
    const d2 = calc(base13, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
    return digits === (base12 + String(d1) + String(d2)) ? null : { cnpj: true };
  }

  phoneValidator(ctrl: AbstractControl): ValidationErrors | null {
    const v: string = (ctrl.value || '').toString().trim();
    if (!v) return null;
    const ok = /^\(\d{2}\)-\d{4}-\d{4}$/.test(v) || /^\(\d{2}\)-\d{5}-\d{4}$/.test(v);
    return ok ? null : { phone: true };
  }

  onPhoneInput(field: 'telefone1'|'telefone2'): void {
    const ctrl = this.form.get(field);
    if (!ctrl) return;
    ctrl.setValue(this.formatPhone(ctrl.value), { emitEvent: false });
  }

  private defaultEmpresaId(): number | null {
    const empresaUsuario = this.empresaUsuarioId();
    if (!this.isSuperUsuario && empresaUsuario) return empresaUsuario;
    return this.empresas.length === 1 && this.empresas[0].id ? this.empresas[0].id : null;
  }

  private empresaUsuarioId(): number | null {
    return this.usuarioAtual?.Idempresa ?? this.usuarioAtual?.empresa?.id ?? null;
  }

  private aplicarUsuarioAtual(user: User | null): void {
    this.usuarioAtual = user;
    this.loadEmpresas();
  }

  empresaLabel(loja: Loja): string {
    if (loja.empresa_nome) return loja.empresa_nome;
    const id = loja.empresa;
    const empresa = this.empresas.find(e => e.id === id);
    return empresa?.nome_fantasia || empresa?.nome || '-';
  }

  // ====== Fluxo ======
  loadUsuarioAtual(): void {
    const cached = this.auth.getCurrentUser() as User | null;
    if (cached) {
      this.aplicarUsuarioAtual(cached);
    }
    this.auth.me().subscribe({
      next: (user) => {
        this.auth.setCurrentUser(user as any);
        this.aplicarUsuarioAtual(user as User);
      },
      error: () => {
        if (!cached) this.loadEmpresas();
      }
    });
  }

  loadEmpresas(): void {
    this.empresasApi.list({ page_size: 2000, ordering: 'nome' }).subscribe({
      next: (res: any) => {
        const empresas = Array.isArray(res) ? res : (res?.results ?? []);
        const empresaUsuario = this.empresaUsuarioId();
        this.empresas = this.isSuperUsuario || !empresaUsuario
          ? empresas
          : empresas.filter((empresa: Empresa) => empresa.id === empresaUsuario);
        const defaultId = this.defaultEmpresaId();
        if (defaultId && (!this.form.get('empresa')?.value || this.empresaBloqueada)) {
          this.form.patchValue({ empresa: defaultId });
        }
        const empresaCtrl = this.form.get('empresa');
        if (this.empresaBloqueada) {
          empresaCtrl?.disable({ emitEvent: false });
        } else {
          empresaCtrl?.enable({ emitEvent: false });
        }
      },
      error: () => {
        this.empresas = [];
      }
    });
  }

  load(): void {
    this.loading = true;
    const params: any = {
      search: this.search,
      page: this.page,
      page_size: this.pageSize,
      ordering: this.sortOrdering(),
    };
    if (this.filterEmpresa) params.empresa = this.filterEmpresa;
    if (this.filterTipo) params.tipo_unidade = this.filterTipo;
    if (this.filterCidade) params.cidade = this.filterCidade;
    if (this.filterEstado) params.estado = this.filterEstado;
    if (this.filterStatus) params.ativo = this.filterStatus === 'ATIVA';
    if (this.filterCnpj) params.cnpj = this.filterCnpj;
    this.api.list(params).subscribe({
      next: (res: any) => {
        const rawArr: Loja[] = Array.isArray(res) ? res : (res?.results ?? []);
        const arr = rawArr.map(item => ({
          ...item,
          empresa: (item as any).empresa ?? null,
          empresa_nome: (item as any).empresa_nome ?? null,
          // compat de apelido
          apelido_loja: item.apelido_loja ?? (item as any).Apelido_loja ?? '',
          // mascarar telefones vindos só com dígitos
          telefone1: this.formatPhone(item.telefone1),
          telefone2: this.formatPhone(item.telefone2),
          tipo_unidade: (item as any).tipo_unidade ?? 'LOJA',
          regime_tributario: (item as any).regime_tributario ?? 'SIMPLES',
          ambiente_fiscal: (item as any).ambiente_fiscal ?? 'HOMOLOGACAO',
        })) as Loja[];
        this.lojasAll = arr;
        this.lojas = arr;
        this.total = Array.isArray(res) ? arr.length : (res?.count ?? arr.length);
        if (this.selectedLoja && !arr.some(l => this.lojaId(l) === this.lojaId(this.selectedLoja))) {
          this.selectedLoja = null;
        }
        this.loadIndicadores();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.lojasAll = [];
        this.lojas = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar estabelecimentos.';
      }
    });
  }

  applyPage(): void {
    this.load();
  }
  onPageSizeChange(size: number | string): void {
    this.pageSize = Number(size) || 20;
    localStorage.setItem('sysvar.list.lojas.pageSize', String(this.pageSize));
    this.page = 1;
    this.load();
  }
  onPageChange(page: number): void {
    this.page = Math.max(1, Math.min(page, this.totalPages));
    this.load();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.load(); } }
  prevPage(): void  { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void  { if (this.page < this.totalPages) { this.page++; this.load(); } }
  lastPage(): void  { if (this.page !== this.totalPages) { this.page = this.totalPages; this.load(); } }
  onSearchKeyup(ev: KeyboardEvent): void { if (ev.key === 'Enter') this.doSearch(); }
  doSearch(): void { this.page = 1; this.load(); }
  clearSearch(): void {
    this.search = '';
    this.filterEmpresa = '';
    this.filterTipo = '';
    this.filterCidade = '';
    this.filterEstado = '';
    this.filterStatus = '';
    this.filterCnpj = '';
    this.page = 1;
    this.load();
  }

  lojaId(loja: Loja | null): number | string | null {
    if (!loja) return null;
    return (loja as any).id ?? (loja as any).Idloja ?? null;
  }

  selecionarLoja(row: Loja): void {
    this.selectedLoja = this.isSelected(row) ? null : row;
  }

  isSelected(row: Loja): boolean {
    return !!this.selectedLoja && this.lojaId(this.selectedLoja) === this.lojaId(row);
  }

  consultarSelecionado(): void {
    if (this.selectedLoja) this.consultar(this.selectedLoja);
  }

  editarSelecionado(): void {
    if (this.selectedLoja && this.podeEditarModulo) this.editar(this.selectedLoja);
  }

  duplicarSelecionado(): void {
    if (this.selectedLoja && this.podeEditarModulo) this.duplicar(this.selectedLoja);
  }

  alternarAtivoSelecionado(): void {
    if (!this.selectedLoja || !this.podeEditarModulo) return;
    this.isAtiva(this.selectedLoja) ? this.abrirInativar(this.selectedLoja) : this.abrirReativar(this.selectedLoja);
  }

  historicoSelecionado(): void {
    if (this.selectedLoja) this.historicoModal = this.selectedLoja;
  }

  excluirSelecionado(): void {
    if (this.selectedLoja && this.podeExcluirModulo) this.excluir(this.selectedLoja);
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
    localStorage.removeItem('sysvar.list.lojas.pageSize');
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.pageSize = 20;
    this.columns = this.columns.map(c => ({ ...c, visible: true }));
    this.saveColumnsPreference();
    this.load();
  }

  @HostListener('window:sysvar-lojas-toggle-indicators')
  onToggleIndicatorsEvent(): void {
    this.toggleIndicators();
  }

  @HostListener('window:sysvar-lojas-toggle-filters')
  onToggleFiltersEvent(): void {
    this.toggleFilters();
  }

  @HostListener('window:sysvar-lojas-restore-view')
  onRestoreViewEvent(): void {
    this.restoreViewPreference();
  }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });
    if (this.empresaBloqueada) this.form.get('empresa')?.disable({ emitEvent: false });

    this.form.reset({
      empresa: this.defaultEmpresaId(),
      nome_loja: '',
      apelido_loja: '',
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
      DataAbertura: '',
      DataEnceramento: '',
      EstoqueNegativo: 'NAO',
      Rede: 'NAO',
      Matriz: 'NAO',
      tipo_unidade: 'LOJA',
      regime_tributario: 'SIMPLES',
      ambiente_fiscal: 'HOMOLOGACAO',
      inscricao_estadual: '',
      serie_nfce: 1,
      proximo_numero_nfce: 1,
      serie_nfe: 1,
      proximo_numero_nfe: 1,
      emite_nfce: true,
      emite_nfe: true,
    });
  }

  editar(row: Loja): void {
    this.showForm = true;
    this.editingId = (row as any).id ?? (row as any).Idloja ?? null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });
    if (this.empresaBloqueada) this.form.get('empresa')?.disable({ emitEvent: false });

    this.form.reset({
      empresa:     (row as any).empresa ?? null,
      nome_loja:    row.nome_loja ?? '',
      apelido_loja: (row as any).apelido_loja ?? (row as any).Apelido_loja ?? '',
      cnpj:         row.cnpj ?? '',
      email:        row.email ?? '',
      logradouro:   row.logradouro ?? 'Rua',
      endereco:     row.endereco ?? '',
      numero:       row.numero ?? '',
      complemento:  row.complemento ?? '',
      cep:          row.cep ?? '',
      bairro:       row.bairro ?? '',
      cidade:       row.cidade ?? '',
      estado:       (row as any).estado ?? '',
      telefone1:    this.formatPhone(row.telefone1),
      telefone2:    this.formatPhone(row.telefone2),

      // novos
      DataAbertura:   (row as any).DataAbertura ?? '',
      DataEnceramento:(row as any).DataEnceramento ?? '',
      EstoqueNegativo:(row as any).EstoqueNegativo ?? 'NAO',
      Rede:           (row as any).Rede ?? 'NAO',
      Matriz:         (row as any).Matriz ?? 'NAO',
      tipo_unidade:   (row as any).tipo_unidade ?? 'LOJA',
      regime_tributario: (row as any).regime_tributario ?? 'SIMPLES',
      ambiente_fiscal: (row as any).ambiente_fiscal ?? 'HOMOLOGACAO',
      inscricao_estadual: (row as any).inscricao_estadual ?? '',
      serie_nfce: (row as any).serie_nfce ?? 1,
      proximo_numero_nfce: (row as any).proximo_numero_nfce ?? 1,
      serie_nfe: (row as any).serie_nfe ?? 1,
      proximo_numero_nfe: (row as any).proximo_numero_nfe ?? 1,
      emite_nfce: (row as any).emite_nfce !== false,
      emite_nfe: (row as any).emite_nfe !== false,
    });
  }

  consultar(row: Loja): void {
    this.editar(row);
  }

  duplicar(row: Loja): void {
    if (!this.podeEditarModulo) return;
    this.novo();
    this.form.patchValue({
      empresa: (row as any).empresa ?? this.defaultEmpresaId(),
      nome_loja: `${row.nome_loja || ''} - cópia`,
      apelido_loja: '',
      cnpj: '',
      email: '',
      logradouro: row.logradouro ?? 'Rua',
      endereco: row.endereco ?? '',
      numero: row.numero ?? '',
      complemento: row.complemento ?? '',
      cep: row.cep ?? '',
      bairro: row.bairro ?? '',
      cidade: row.cidade ?? '',
      estado: (row as any).estado ?? '',
      telefone1: '',
      telefone2: '',
      EstoqueNegativo: (row as any).EstoqueNegativo ?? 'NAO',
      Rede: (row as any).Rede ?? 'NAO',
      Matriz: 'NAO',
      tipo_unidade: (row as any).tipo_unidade ?? 'LOJA',
      regime_tributario: (row as any).regime_tributario ?? 'SIMPLES',
      ambiente_fiscal: (row as any).ambiente_fiscal ?? 'HOMOLOGACAO',
      inscricao_estadual: '',
      serie_nfce: 1,
      proximo_numero_nfce: 1,
      serie_nfe: 1,
      proximo_numero_nfe: 1,
      emite_nfce: (row as any).emite_nfce !== false,
      emite_nfe: (row as any).emite_nfe !== false,
    });
    this.successMsg = 'Revise os dados antes de salvar o novo estabelecimento.';
  }

  cancelarEdicao(): void {
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.errorOverlayOpen = false;
    this.form.enable({ emitEvent: false });
    if (this.empresaBloqueada) this.form.get('empresa')?.disable({ emitEvent: false });
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlayIfNeeded(); return; }

    const f = this.form.getRawValue() as any;
    const apelido = (f.apelido_loja || '').toString().trim();

    // datas: '' -> null (DRF aceita null para DateField nullable)
    const dataAbertura = this.blankToNull(f.DataAbertura);
    const dataEnceramento = this.blankToNull(f.DataEnceramento);

    const payload: any = {
      empresa: f.empresa ? Number(f.empresa) : null,
      nome_loja: (f.nome_loja || '').toString().trim(),
      cnpj: (f.cnpj || '').toString().trim(),

      // apelido nas duas chaves (compat)
      Apelido_loja: apelido,
      apelido_loja: apelido,

      email: this.blankToNull(f.email),
      logradouro: this.blankToNull(f.logradouro),
      endereco: this.blankToNull(f.endereco),
      numero: this.blankToNull(f.numero),
      complemento: this.blankToNull(f.complemento),
      cep: this.blankToNull(f.cep),
      bairro: this.blankToNull(f.bairro),
      cidade: this.blankToNull(f.cidade),
      estado: this.blankToNull(f.estado),

      telefone1: this.blankToNull(f.telefone1),
      telefone2: this.blankToNull(f.telefone2),

      // **novos campos com NOME EXATO DO BACKEND**
      EstoqueNegativo: this.blankToNull(f.EstoqueNegativo),
      Rede: this.blankToNull(f.Rede),
      Matriz: this.blankToNull(f.Matriz),
      tipo_unidade: this.blankToNull(f.tipo_unidade),
      DataAbertura: dataAbertura,
      DataEnceramento: dataEnceramento,
      regime_tributario: this.blankToNull(f.regime_tributario) || 'SIMPLES',
      ambiente_fiscal: this.blankToNull(f.ambiente_fiscal) || 'HOMOLOGACAO',
      inscricao_estadual: this.blankToNull(f.inscricao_estadual),
      serie_nfce: Number(f.serie_nfce || 1),
      proximo_numero_nfce: Number(f.proximo_numero_nfce || 1),
      serie_nfe: Number(f.serie_nfe || 1),
      proximo_numero_nfe: Number(f.proximo_numero_nfe || 1),
      emite_nfce: f.emite_nfce === true,
      emite_nfe: f.emite_nfe === true,
    };

    this.saving = true;
    const req$ = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas com sucesso.' : 'Estabelecimento criado com sucesso.';
        this.cancelarEdicao();
        this.page = 1;
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.successMsg = '';

        const serverErrors = err?.error && typeof err.error === 'object' ? err.error : null;
        if (serverErrors) {
          const mapToCtrl = (apiField: string) => {
            if (apiField === 'Apelido_loja' || apiField === 'apelido_loja') return 'apelido_loja';
            return apiField;
          };
          const seen = new Set<string>();
          Object.keys(serverErrors).forEach(apiField => {
            const ctrlName = mapToCtrl(apiField);
            if (seen.has(ctrlName)) return;
            const ctrl = this.form.get(ctrlName);
            if (ctrl) {
              ctrl.setErrors({
                ...(ctrl.errors || {}),
                server: Array.isArray(serverErrors[apiField]) ? serverErrors[apiField].join(' ') : String(serverErrors[apiField])
              });
              seen.add(ctrlName);
            }
          });
        }
        this.openErrorOverlayIfNeeded();
      }
    });
  }

  excluir(item: Loja): void {
    if (!this.podeExcluirModulo) return;
    const id = (item as any).id ?? (item as any).Idloja;
    if (!id) return;
    this.excluirModal = item;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const item = this.excluirModal;
    const id = item ? ((item as any).id ?? (item as any).Idloja) : null;
    if (!id) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.excluirModal = null;
        this.successMsg = 'Estabelecimento excluído.';
        const eraUltimo = this.lojas.length === 1 && this.page > 1;
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

  abrirInativar(item: Loja): void {
    if (!this.podeEditarModulo) return;
    this.inativarModal = item;
  }

  abrirReativar(item: Loja): void {
    if (!this.podeEditarModulo) return;
    this.reativarModal = item;
  }

  confirmarInativar(): void {
    const id = this.inativarModal ? ((this.inativarModal as any).id ?? (this.inativarModal as any).Idloja) : null;
    if (!id) return;
    this.api.inativar(id).subscribe({
      next: () => {
        this.inativarModal = null;
        this.successMsg = 'Estabelecimento inativado com sucesso.';
        this.load();
      },
      error: (err) => {
        const impedimentos = err?.error?.impedimentos;
        this.errorMsg = Array.isArray(impedimentos) && impedimentos.length
          ? `Não foi possível inativar: ${impedimentos.join(', ')}.`
          : 'Não foi possível inativar o estabelecimento.';
      }
    });
  }

  confirmarReativar(): void {
    const id = this.reativarModal ? ((this.reativarModal as any).id ?? (this.reativarModal as any).Idloja) : null;
    if (!id) return;
    this.api.ativar(id).subscribe({
      next: () => {
        this.reativarModal = null;
        this.successMsg = 'Estabelecimento reativado com sucesso.';
        this.load();
      },
      error: () => this.errorMsg = 'Não foi possível reativar o estabelecimento.'
    });
  }

  abrirEncerrar(item: Loja): void {
    if (!this.podeEditarModulo) return;
    this.encerrarModal = item;
    this.encerramentoData = new Date().toISOString().slice(0, 10);
    this.encerramentoMotivo = '';
  }

  confirmarEncerrar(): void {
    const id = this.encerrarModal ? ((this.encerrarModal as any).id ?? (this.encerrarModal as any).Idloja) : null;
    if (!id) return;
    this.api.encerrar(id, { data: this.encerramentoData, motivo: this.encerramentoMotivo }).subscribe({
      next: () => {
        this.encerrarModal = null;
        this.successMsg = 'Estabelecimento encerrado com sucesso.';
        this.load();
      },
      error: () => this.errorMsg = 'Não foi possível encerrar o estabelecimento.'
    });
  }

  confirmarReabrir(item: Loja): void {
    const id = (item as any).id ?? (item as any).Idloja;
    if (!id || !this.podeEditarModulo) return;
    this.api.reabrir(id).subscribe({
      next: () => {
        this.successMsg = 'Estabelecimento reaberto com sucesso.';
        this.load();
      },
      error: () => this.errorMsg = 'Não foi possível reabrir o estabelecimento.'
    });
  }

  executarAcao(key: string, loja: Loja): void {
    if (key === 'consultar') this.consultar(loja);
    if (key === 'editar') this.editar(loja);
    if (key === 'duplicar') this.duplicar(loja);
    if (key === 'historico') this.historicoModal = loja;
    if (key === 'inativar') this.abrirInativar(loja);
    if (key === 'reativar') this.abrirReativar(loja);
    if (key === 'encerrar') this.abrirEncerrar(loja);
    if (key === 'reabrir') this.confirmarReabrir(loja);
    if (key === 'excluir') this.excluir(loja);
  }

  rowActions(loja: Loja): RowAction[] {
    const ativa = this.isAtiva(loja);
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo },
      { key: 'duplicar', label: 'Duplicar', icon: '⧉', visible: this.podeEditarModulo },
      { key: ativa ? 'inativar' : 'reativar', label: ativa ? 'Inativar' : 'Reativar', icon: ativa ? '⊘' : '↻', visible: this.podeEditarModulo },
      { key: 'encerrar', label: 'Encerrar', icon: '■', visible: ativa && this.podeEditarModulo },
      { key: 'reabrir', label: 'Reabrir', icon: '↻', visible: !ativa && !!loja.DataEnceramento && this.podeEditarModulo },
      { key: 'historico', label: 'Histórico', icon: '↺' },
      { key: 'excluir', label: 'Excluir', icon: '×', danger: true, dividerBefore: true, visible: this.podeExcluirModulo },
    ];
  }

  sortBy(key: typeof this.sortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.load();
  }

  private sortOrdering(): string {
    const map: Record<string, string> = {
      nome: 'nome_loja',
      empresa: 'empresa',
      tipo: 'tipo_unidade',
      cidade: 'cidade',
      status: 'ativo',
      data: 'data_cadastro',
    };
    const field = map[this.sortKey] || 'nome_loja';
    return this.sortDir === 'desc' ? `-${field}` : field;
  }

  private loadIndicadores(): void {
    this.api.indicadores().subscribe({
      next: (data: any) => this.indicadoresApi = {
        total: Number(data?.total || 0),
        ativos: Number(data?.ativos || 0),
        inativos: Number(data?.inativos || 0),
        lojas: Number(data?.lojas || 0),
        matrizes: Number(data?.matrizes || 0),
        fabricas: Number(data?.fabricas || 0),
      },
      error: () => {}
    });
  }

  sortIcon(key: typeof this.sortKey): string {
    if (this.sortKey !== key) return '↕';
    return this.sortDir === 'asc' ? '↓' : '↑';
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
    const rows = this.lojasFiltradas;
    const headers = ['Estabelecimento', 'Empresa', 'Tipo', 'Apelido', 'CNPJ', 'Cidade/UF', 'Email', 'Telefone', 'Status', 'Cadastro'];
    const body = rows.map(l => [
      l.nome_loja,
      this.empresaLabel(l),
      this.tipoUnidadeLabel(l.tipo_unidade),
      l.apelido_loja || '',
      this.formatCnpj(l.cnpj),
      this.cidadeUf(l),
      l.email || '',
      this.formatPhone(l.telefone1),
      this.isAtiva(l) ? 'Ativa' : 'Inativa',
      this.formatDate(l.data_cadastro),
    ]);
    const csv = [headers, ...body]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'estabelecimentos.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.exportOpen = false;
  }

  formatCnpj(value?: string | null): string {
    const d = (value || '').replace(/\D/g, '').slice(0, 14);
    if (d.length !== 14) return value || '-';
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`;
  }

  cidadeUf(loja: Loja): string {
    const cidade = (loja.cidade || '').trim();
    const uf = ((loja as any).estado || '').trim().toUpperCase();
    if (cidade && uf) return `${cidade}/${uf}`;
    return cidade || uf || '-';
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  isAtiva(loja: Loja): boolean {
    return loja.ativo !== false;
  }

  statusVariant(loja: Loja): 'success' | 'muted' {
    return this.isAtiva(loja) ? 'success' : 'muted';
  }

  tipoVariant(tipo?: string | null): 'info' | 'purple' | 'warning' | 'muted' {
    const t = (tipo || '').toUpperCase();
    if (t === 'LOJA') return 'info';
    if (t === 'MATRIZ') return 'info';
    if (t === 'FABRICA') return 'warning';
    return 'muted';
  }

  percentual(valor: number): string {
    const total = this.indicadores.total || 0;
    if (!total) return '0% do total';
    return `${((valor / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% do total`;
  }

  trackLoja(_: number, loja: Loja): number | string {
    return (loja as any).id ?? (loja as any).Idloja ?? loja.cnpj ?? loja.nome_loja;
  }

  private matchesFilters(l: Loja): boolean {
    const term = this.normalize(this.search);
    const all = this.normalize([
      l.nome_loja,
      l.apelido_loja,
      l.cnpj,
      l.cidade,
      l.email,
      l.telefone1,
      l.telefone2,
      this.empresaLabel(l),
      this.tipoUnidadeLabel(l.tipo_unidade)
    ].join(' '));
    if (term && !all.includes(term)) return false;
    if (this.filterEmpresa && Number(l.empresa) !== Number(this.filterEmpresa)) return false;
    if (this.filterTipo && (l.tipo_unidade || '').toUpperCase() !== this.filterTipo) return false;
    if (this.filterCidade && (l.cidade || '') !== this.filterCidade) return false;
    if (this.filterEstado && this.normalize((l as any).estado) !== this.normalize(this.filterEstado)) return false;
    if (this.filterStatus === 'ATIVA' && !this.isAtiva(l)) return false;
    if (this.filterStatus === 'INATIVA' && this.isAtiva(l)) return false;
    if (this.filterCnpj && !this.normalize(l.cnpj).includes(this.normalize(this.filterCnpj))) return false;
    return true;
  }

  private compareLojas(a: Loja, b: Loja): number {
    const val = (l: Loja) => {
      if (this.sortKey === 'nome') return l.nome_loja || '';
      if (this.sortKey === 'empresa') return this.empresaLabel(l);
      if (this.sortKey === 'tipo') return this.tipoUnidadeLabel(l.tipo_unidade);
      if (this.sortKey === 'cidade') return this.cidadeUf(l);
      if (this.sortKey === 'status') return this.isAtiva(l) ? 'Ativa' : 'Inativa';
      return l.data_cadastro || '';
    };
    const result = String(val(a)).localeCompare(String(val(b)), 'pt-BR', { numeric: true });
    return this.sortDir === 'asc' ? result : -result;
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.lojas.pageSize'));
    if ([20, 50, 100].includes(size)) this.pageSize = size;
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
      this.indicatorsVisible = pref.indicatorsVisible !== false;
      this.filtersVisible = pref.filtersVisible !== false;
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

  // ====== Overlay de erros ======
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const push = (cond: boolean, msg: string) => { if (cond) msgs.push(msg); };

    push(f.get('empresa')?.hasError('required') || false, 'empresa: Este campo é obrigatório.');
    push(f.get('nome_loja')?.hasError('required') || false, 'nome_loja: Este campo é obrigatório.');
    push(f.get('nome_loja')?.hasError('maxlength') || false, 'nome_loja: Máx. 50 caracteres.');
    push(f.get('apelido_loja')?.hasError('required') || false, 'apelido_loja: Este campo é obrigatório.');
    push(f.get('apelido_loja')?.hasError('maxlength') || false, 'apelido_loja: Máx. 20 caracteres.');
    push(f.get('cnpj')?.hasError('required') || false, 'cnpj: Este campo é obrigatório.');
    push(f.get('cnpj')?.hasError('cnpj') || false, 'cnpj: CNPJ inválido.');
    push(f.get('email')?.hasError('email') || false, 'email: Email inválido.');
    push(f.get('numero')?.hasError('maxlength') || false, 'numero: Máx. 10 caracteres.');
    push(f.get('telefone1')?.hasError('phone') || false, 'telefone1: Formato (99)-9999-9999 ou (99)-99999-9999.');
    push(f.get('telefone2')?.hasError('phone') || false, 'telefone2: Formato (99)-9999-9999 ou (99)-99999-9999.');

    const fields = [
      'empresa','nome_loja','apelido_loja','cnpj','email',
      'logradouro','endereco','numero','complemento',
      'cep','bairro','cidade','estado',
      'telefone1','telefone2',
      'DataAbertura','DataEnceramento',
      'EstoqueNegativo','Rede','Matriz','tipo_unidade'
    ];
    const seen = new Set<string>();
    fields.forEach(field => {
      const err = f.get(field)?.errors?.['server'];
      if (err && !seen.has(field)) { msgs.push(`${field}: ${err}`); seen.add(field); }
    });

    return msgs;
  }

  openErrorOverlayIfNeeded(): void { this.errorOverlayOpen = this.getFormErrors().length > 0; }
  closeErrorOverlay(): void { this.errorOverlayOpen = false; }

  tipoUnidadeLabel(tipo?: string | null): string {
    const labels: Record<string, string> = {
      LOJA: 'Loja',
      MATRIZ: 'Loja',
      FABRICA: 'Fábrica',
    };
    return labels[tipo || ''] || '-';
  }
}
