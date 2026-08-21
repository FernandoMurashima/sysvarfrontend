import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import { UsersService } from '../../core/services/users.service';
import { User } from '../../core/models/user';

import { LojasService } from '../../core/services/lojas.service';
import { EmpresasService } from '../../core/services/empresas.service';
import { Empresa } from '../../core/models/empresa';
import { SessionService } from '../../core/services/session.service';

import {Router} from "@angular/router";
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { AccessControlService, PerfilAcesso } from '../../core/services/access-control.service';

type Loja = {
  id?: number;
  Idloja?: number;
  empresa?: number | null;
  nome_loja?: string;
  apelido_loja?: string;
};

type ModuloPermissao = {
  key: string;
  label: string;
  perfil?: 'NONE' | 'VIEW' | 'EDIT';
  acesso: 'HERDAR' | 'NONE' | 'VIEW' | 'EDIT';
  efetivo?: 'NONE' | 'VIEW' | 'EDIT';
};

const REQUISICOES_DIREITOS: Record<string, { label: string; active: 'VIEW' | 'EDIT' }> = {
  requisicoes: { label: 'Requisitar', active: 'EDIT' },
  requisicoes_analise: { label: 'Analisar', active: 'EDIT' },
  requisicoes_atendimento: { label: 'Atender', active: 'EDIT' },
  requisicoes_todas: { label: 'Visualizar todas', active: 'VIEW' },
};

type CampoPermissao = {
  key: string;
  label: string;
  pode_ver: boolean;
};

type SessaoUsuarioRow = {
  id: number;
  status: string;
  empresa_nome?: string;
  loja_nome?: string;
  dispositivo_id: string;
  navegador?: string;
  sistema_operacional?: string;
  ip?: string;
  iniciada_em: string;
  ultima_atividade_em: string;
  heartbeat?: string;
  token_valido?: boolean;
  token_revogado?: boolean;
  validade_motivo?: string;
  motivo_encerramento?: string;
  tempo_conectado_segundos?: number;
  origem?: string;
};

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SearchSuggestComponent],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(UsersService);
  private auth = inject(AuthService);
  private lojasApi = inject(LojasService);
  private empresasApi = inject(EmpresasService);
  private accessApi = inject(AccessControlService);
  private sessionsApi = inject(SessionService);
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/home']);
  }

  loading = false;
  saving = false;
  submitted = false;

  successMsg = '';
  errorMsg = '';
  excluirModal: User | null = null;
  sessoesModalUser: User | null = null;
  sessoesUsuario: SessaoUsuarioRow[] = [];
  sessoesLoading = false;
  private successTimer: any = null;

  showForm = false;
  errorOverlayOpen = false;
  consultando = false;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('operacional', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('operacional');
  }

  usuarios: User[] = [];
  empresas: Empresa[] = [];
  lojas: Loja[] = [];
  perfis: PerfilAcesso[] = [];
  usuarioAtual: User | null = null;
  search = '';
  filterType = '';
  filterStatus = '';
  advancedOpen = false;
  columnsOpen = false;
  exportOpen = false;
  selectedUser: User | null = null;
  indicatorsVisible = true;
  filtersVisible = true;
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;
  indicadoresApi = { total: 0, ativos: 0, inativos: 0, masters: 0, com_sessao_ativa: 0 };
  private readonly columnsStorageKey = 'sysvar.list.usuarios.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.usuarios';
  columns = [
    { key: 'usuario', label: 'Usuário', visible: true, required: true },
    { key: 'nome', label: 'Nome', visible: true, required: false },
    { key: 'email', label: 'Email', visible: true, required: false },
    { key: 'tipo', label: 'Tipo', visible: true, required: false },
    { key: 'empresa', label: 'Empresa', visible: true, required: false },
    { key: 'loja', label: 'Loja principal', visible: true, required: false },
    { key: 'lojas', label: 'Lojas', visible: true, required: false },
  ];
  editingId: number | null = null;

  typeOptions: User['type'][] = [
    'Regular',
    'Vendedor',
    'Caixa',
    'Gerente',
    'Diretor',
    'Admin',
    'Auxiliar',
    'Assistente',
    'AssistenteReceber',
    'AssistentePagar'
  ];

  modulosPermissao: ModuloPermissao[] = [];

  camposPermissao: CampoPermissao[] = [];

  form = this.fb.group({
    username: ['', [Validators.required, Validators.maxLength(150), this.usernameValidator]],
    first_name: [''],
    last_name: [''],
    email: ['', [Validators.email]],
    type: ['Regular', [Validators.required]],
    Idempresa: [null as number | null],
    Idloja: [null as number | null],
    Idlojas: [[] as number[]],
    perfil_principal_id: [null as number | null],
    password: [''],          // obrigatória somente no create
    confirm_password: [''],  // só no front
  });

  private tiposExigemLoja = new Set<User['type']>([
    'Vendedor',
    'Caixa',
    'Gerente',
    'Assistente',
    'AssistenteReceber',
    'AssistentePagar'
  ]);

  get searchSuggestions(): string[] {
    return this.usuarios.flatMap(u => [
      u.username,
      u.first_name,
      u.last_name,
      u.email,
      u.type,
      u.empresa?.nome_fantasia,
      u.empresa?.nome,
      u.loja?.nome_loja,
    ].filter((v): v is string => !!v));
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.loadUsuarioAtual();
    this.load();
    this.loadLojas();
    this.loadPerfis();
    this.loadModulos();
  }

  get isSuperUsuario(): boolean { return this.usuarioAtual?.is_superuser === true; }
  get empresaBloqueada(): boolean { return !!this.usuarioAtual && !this.isSuperUsuario; }
  get usuarioFormularioAdmin(): boolean {
    return this.form.getRawValue().type === 'Admin';
  }

  get contratoUsuario(): any {
    return (this.usuarioAtual as any)?.contrato || null;
  }

  private empresaUsuarioId(): number | null {
    return this.usuarioAtual?.Idempresa ?? this.usuarioAtual?.empresa?.id ?? null;
  }

  private empresaDefaultId(): number | null {
    const empresaUsuario = this.empresaUsuarioId();
    if (!this.isSuperUsuario && empresaUsuario) return empresaUsuario;
    return this.empresas.length === 1 && this.empresas[0].id ? this.empresas[0].id : null;
  }

  private aplicarEmpresaBloqueada(): void {
    const defaultId = this.empresaDefaultId();
    if (defaultId && (!this.form.get('Idempresa')?.value || this.empresaBloqueada)) {
      this.form.patchValue({ Idempresa: defaultId });
    }
    const empresaCtrl = this.form.get('Idempresa');
    if (this.empresaBloqueada) {
      empresaCtrl?.disable({ emitEvent: false });
    } else {
      empresaCtrl?.enable({ emitEvent: false });
    }
    this.onEmpresaChange();
  }

  private loadUsuarioAtual() {
    const cached = this.auth.getCurrentUser() as User | null;
    if (cached) {
      this.usuarioAtual = cached;
      this.loadEmpresas();
    }
    this.auth.me().subscribe({
      next: (user) => {
        this.auth.setCurrentUser(user as any);
        this.usuarioAtual = user as User;
        this.loadEmpresas();
        this.loadModulos();
      },
      error: () => {
        if (!cached) this.loadEmpresas();
      }
    });
  }

  private loadEmpresas() {
    this.empresasApi.list({ ordering: 'nome', page_size: 1000 }).subscribe({
      next: (res: any) => {
        const empresas = Array.isArray(res) ? res : (res?.results ?? []);
        const empresaUsuario = this.empresaUsuarioId();
        this.empresas = this.isSuperUsuario || !empresaUsuario
          ? empresas
          : empresas.filter((empresa: Empresa) => empresa.id === empresaUsuario);
        this.aplicarEmpresaBloqueada();
      },
      error: (err) => console.error(err)
    });
  }

  private loadLojas() {
    this.lojasApi.list({ ordering: 'nome_loja', page_size: 100 }).subscribe({
      next: (res: any) => {
        this.lojas = Array.isArray(res) ? res : (res?.results ?? []);
      },
      error: (err) => {
        console.error(err);
        // mantém silencioso; o campo ficará vazio se falhar
      }
    });
  }

  usernameValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value || '').toString().trim();
    if (!v) return null;
    const ok = /^[A-Za-z0-9_.-]+$/.test(v);
    return ok ? null : { username: true };
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.load(); }
  doSearch() { this.page = 1; this.load(); }
  clearSearch() { this.search = ''; this.filterType = ''; this.filterStatus = ''; this.page = 1; this.load(); }

  load() {
    this.loading = true;
    this.errorMsg = '';
    const params: any = { search: this.search, ordering: '-id', page: this.page, page_size: this.pageSize };
    if (this.filterType) params.type = this.filterType;
    if (this.filterStatus) params.ativo = this.filterStatus === 'ativo';
    this.api.list(params).subscribe({
      next: (data) => {
        this.usuarios = Array.isArray(data) ? data : (data as any).results ?? [];
        this.total = Array.isArray(data) ? this.usuarios.length : ((data as any).count ?? this.usuarios.length);
        this.loadIndicadores();
      },
      error: (err) => { this.errorMsg = 'Falha ao carregar usuários.'; console.error(err); },
      complete: () => this.loading = false
    });
  }

  novo() {
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.showForm = true;
    this.errorOverlayOpen = false;
    this.form.enable({ emitEvent: false });

    this.form.reset({
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      type: 'Regular',
      Idempresa: this.empresaDefaultId(),
      Idloja: null,       // limpa loja
      Idlojas: [],
      perfil_principal_id: null,
      password: '',
      confirm_password: '',
    });
    this.resetPermissoes();
    this.normalizarPermissoesPorTipo();
    this.aplicarEmpresaBloqueada();
    this.successMsg = '';
    this.errorMsg = '';
  }

  editar(item: User) {
    this.editingId = item.id ?? null;
    this.consultando = false;
    this.submitted = false;
    this.showForm = true;
    this.errorOverlayOpen = false;
    this.form.enable({ emitEvent: false });

    this.form.patchValue({
      username: item.username ?? '',
      first_name: item.first_name ?? '',
      last_name: item.last_name ?? '',
      email: item.email ?? '',
      type: item.type ?? 'Regular',
      Idempresa: item.Idempresa ?? item.empresa?.id ?? null,
      Idloja: item.Idloja ?? item.loja?.Idloja ?? null,
      Idlojas: item.Idlojas ?? item.lojas?.map(l => l.Idloja).filter((id): id is number => !!id) ?? [],
      perfil_principal_id: item.perfil_principal_id ?? item.perfil_principal?.id ?? null,
      password: '',
      confirm_password: '',
    });
    this.aplicarPermissoesUsuario(item);
    this.normalizarPermissoesPorTipo();
    this.aplicarEmpresaBloqueada();
    this.successMsg = '';
    this.errorMsg = '';
  }

  consultar(item: User) {
    this.editar(item);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  cancelarEdicao() {
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.errorOverlayOpen = false;
    this.form.enable({ emitEvent: false });
    this.form.reset();
  }

  private normalizePayload(raw: any): any {
    const payload: any = {
      username: (raw.username ?? '').trim(),
      first_name: (raw.first_name ?? '').trim() || undefined,
      last_name: (raw.last_name ?? '').trim() || undefined,
      email: (raw.email ?? '').trim() || undefined,
      type: raw.type as User['type'],
    };
    if (raw.Idempresa != null && raw.Idempresa !== '') payload.Idempresa = Number(raw.Idempresa);
    if (raw.Idloja != null && raw.Idloja !== '') payload.Idloja = Number(raw.Idloja); // envia só se setado
    const lojas = (raw.Idlojas || []).map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id));
    if (payload.Idloja && !lojas.includes(payload.Idloja)) lojas.push(payload.Idloja);
    payload.Idlojas = lojas;
    if (raw.perfil_principal_id != null && raw.perfil_principal_id !== '') {
      payload.perfil_principal_id = Number(raw.perfil_principal_id);
    }
    const pwd = (raw.password ?? '').trim();
    if (pwd) payload.password = pwd;
    return payload;
  }

  private resetPermissoes(): void {
    this.modulosPermissao = this.modulosPermissao.map(m => ({ ...m, acesso: 'HERDAR', perfil: 'NONE', efetivo: 'NONE' }));
    this.camposPermissao = this.camposPermissao.map(c => ({ ...c, pode_ver: false }));
    this.normalizarPermissoesPorTipo();
  }

  private aplicarPermissoesUsuario(item: User): void {
    const modulos = new Map((item.permissoes_modulos || []).map(p => [p.modulo, p.acesso]));
    const detalhadas = new Map(((item as any).permissoes_efetivas_detalhadas || []).map((p: any) => [p.modulo, p]));
    this.modulosPermissao = this.modulosPermissao.map(m => ({
      ...m,
      perfil: (detalhadas.get(m.key) as any)?.perfil || m.perfil || 'NONE',
      acesso: (modulos.get(m.key) as any) || 'HERDAR',
      efetivo: (detalhadas.get(m.key) as any)?.efetivo || (item.permissoes_efetivas?.[m.key] as any) || m.efetivo || 'NONE',
    }));
    const campos = new Map((item.permissoes_campos || []).map(p => [p.campo, p.pode_ver]));
    this.camposPermissao = this.camposPermissao.map(c => ({
      ...c,
      pode_ver: campos.has(c.key) ? Boolean(campos.get(c.key)) : false,
    }));
  }

  onTipoChange(): void {
    this.normalizarPermissoesPorTipo();
  }

  private normalizarPermissoesPorTipo(): void {
  }

  isDireitoRequisicoes(modulo: ModuloPermissao): boolean {
    return modulo.key in REQUISICOES_DIREITOS;
  }

  direitoRequisicoesLabel(modulo: ModuloPermissao): string {
    return REQUISICOES_DIREITOS[modulo.key]?.label || modulo.label;
  }

  setDireitoRequisicoes(modulo: ModuloPermissao, ativo: boolean): void {
    modulo.acesso = ativo ? REQUISICOES_DIREITOS[modulo.key].active : 'NONE';
  }

  direitoRequisicoesAtivo(modulo: ModuloPermissao): boolean {
    return modulo.acesso !== 'HERDAR' && modulo.acesso !== 'NONE';
  }

  private validatePasswordPair(): string | null {
    const pwd = (this.form.get('password')?.value || '').toString().trim();
    const conf = (this.form.get('confirm_password')?.value || '').toString().trim();
    if (!this.editingId && !pwd) {
      return 'Senha: obrigatória no cadastro.';
    }
    if (!pwd) return null;
    if (pwd.length < 6) return 'Senha: mínimo 6 caracteres.';
    if (pwd !== conf) return 'Senha/Confirmação: não conferem.';
    return null;
  }

  private setSuccess(message: string): void {
    this.successMsg = message;
    if (this.successTimer) clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => {
      this.successMsg = '';
      this.successTimer = null;
    }, 3500);
  }

  private clearPairErrors(): void {
    for (const key of ['password', 'confirm_password']) {
      const ctrl = this.form.get(key);
      if (!ctrl?.errors?.['pair']) continue;
      const next = { ...ctrl.errors };
      delete next['pair'];
      ctrl.setErrors(Object.keys(next).length ? next : null);
    }
  }

  private applyBackendErrors(err: any) {
    const be = err?.error;
    if (!be || typeof be !== 'object') return;
    Object.keys(be).forEach((key) => {
      const ctrl = this.form.get(key);
      const val = Array.isArray(be[key]) ? be[key].join(' ') : String(be[key]);
      if (ctrl) {
        const current = ctrl.errors || {};
        ctrl.setErrors({ ...current, server: val || 'Valor inválido' });
      } else {
        this.errorMsg = val || this.errorMsg;
      }
    });
  }

  getFormErrors(): string[] {
    const labels: Record<string, string> = {
      username: 'Usuário',
      first_name: 'Nome',
      last_name: 'Sobrenome',
      email: 'Email',
      type: 'Tipo',
      Idempresa: 'Empresa',
      Idloja: 'Loja',
      Idlojas: 'Lojas permitidas',
      password: 'Senha',
    };
    const msgs: string[] = [];
    for (const key of Object.keys(this.form.controls)) {
      const c = this.form.get(key);
      if (!c || !c.errors) continue;
      const label = labels[key] ?? key;

      if (c.errors['required']) msgs.push(`${label}: faltando informação.`);
      if (c.errors['maxlength']) msgs.push(`${label}: fora do padrão (tamanho acima do permitido).`);
      if (c.errors['email']) msgs.push(`Email: formato inválido.`);
      if (c.errors['username']) msgs.push(`Usuário: use só letras, números, . _ - (sem espaços).`);
      if (c.errors['server']) msgs.push(`${label}: ${c.errors['server']}`);
    }
    const pwdPair = this.validatePasswordPair();
    if (pwdPair) msgs.push(pwdPair);
    return msgs;
  }

  private scrollToFirstInvalid(): void {
    for (const key of Object.keys(this.form.controls)) {
      const ctrl = this.form.get(key);
      if (ctrl && ctrl.invalid) {
        const el = document.querySelector(`[formControlName="${key}"]`) as HTMLElement | null;
        if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLInputElement | null)?.focus?.();
        break;
      }
    }
  }

  closeErrorOverlay() { this.errorOverlayOpen = false; }

  salvar() {
    this.submitted = true;
    this.clearPairErrors();
    const raw = this.form.getRawValue();

    const pwdPairMsg = this.validatePasswordPair();
    if (pwdPairMsg) {
      for (const key of ['password', 'confirm_password']) {
        const current = this.form.get(key)?.errors || {};
        this.form.get(key)?.setErrors({ ...current, pair: true });
      }
    }

    if (this.tiposExigemLoja.has(raw.type as User['type']) && !raw.Idloja) {
      const current = this.form.get('Idloja')?.errors || {};
      this.form.get('Idloja')?.setErrors({ ...current, required: true });
    }
    if (!raw.Idempresa) {
      const current = this.form.get('Idempresa')?.errors || {};
      this.form.get('Idempresa')?.setErrors({ ...current, required: true });
    }
    if (this.form.invalid || !!pwdPairMsg) {
      this.form.markAllAsTouched();
      this.scrollToFirstInvalid();
      this.errorOverlayOpen = true;
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.errorOverlayOpen = false;

    this.normalizarPermissoesPorTipo();
    const payload = this.normalizePayload(raw);

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload as User);

    req$.subscribe({
      next: () => {
        this.setSuccess(this.editingId ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.');
        this.load();
        this.cancelarEdicao();
        this.saving = false;
        this.submitted = false;
      },
      error: (err) => {
        console.error(err);
        this.applyBackendErrors(err);
        this.saving = false;
        this.scrollToFirstInvalid();
        this.errorOverlayOpen = this.getFormErrors().length > 0;
        if (!this.errorOverlayOpen) this.errorMsg = 'Não foi possível salvar. Tente novamente.';
      }
    });
  }

  excluir(item: User) {
    if (!this.podeExcluirModulo) return;
    if (!item.id) return;
    this.excluirModal = item;
  }

  confirmarExclusao(): void {
    if (!this.podeExcluirModulo) return;
    const item = this.excluirModal;
    if (!item?.id) return;
    this.api.remove(item.id).subscribe({
      next: () => {
        this.excluirModal = null;
        this.setSuccess('Usuário excluído.');
        this.load();
        if (this.editingId === item.id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      }
    });
  }

  private loadPerfis() {
    const empresa = this.empresaSelecionadaId() ?? this.empresaDefaultId() ?? undefined;
    this.accessApi.perfis(empresa ? { empresa } : undefined).subscribe({
      next: (res: any) => {
        this.perfis = (Array.isArray(res) ? res : (res?.results ?? [])).filter((p: PerfilAcesso) => p.ativo !== false);
        const atual = this.form.getRawValue().perfil_principal_id;
        if (atual && !this.perfis.some(p => p.id === Number(atual))) {
          this.form.patchValue({ perfil_principal_id: null });
        }
        this.selecionarPerfilPadraoPorTipo();
        this.aplicarPerfilSelecionado();
      },
      error: () => this.perfis = []
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  get usuariosFiltrados(): User[] {
    const term = this.normalize(this.search);
    return this.usuarios.filter(u => {
      const nome = `${u.first_name || ''} ${u.last_name || ''}`;
      const matchesSearch = !term || [u.username, nome, u.email, u.type, this.empresaNome(u.Idempresa ?? u.empresa?.id), this.lojaNome(u.Idloja || u.loja?.Idloja)].some(v => this.normalize(v).includes(term));
      const matchesType = !this.filterType || u.type === this.filterType;
      const ativo = u.is_staff !== false;
      const matchesStatus = !this.filterStatus || (this.filterStatus === 'ativo' && ativo) || (this.filterStatus === 'inativo' && !ativo);
      return matchesSearch && matchesType && matchesStatus;
    });
  }

  get usuariosPaginados(): User[] {
    return this.usuarios;
  }

  get totalFiltrado(): number { return this.total; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalFiltrado / this.pageSize)); }
  get pageStart(): number { return this.totalFiltrado ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.totalFiltrado); }
  get indicadores() {
    return {
      total: this.indicadoresApi.total,
      ativos: this.indicadoresApi.ativos,
      admins: this.indicadoresApi.masters,
      lojas: this.indicadoresApi.com_sessao_ativa,
      filtrados: this.totalFiltrado,
    };
  }
  onPageSizeChange(v: string): void { this.pageSize = Number(v) || 20; localStorage.setItem('sysvar.list.usuarios.pageSize', String(this.pageSize)); this.page = 1; this.load(); }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.load(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.load(); } }
  lastPage(): void { if (this.page !== this.totalPages) { this.page = this.totalPages; this.load(); } }
  visibleColumn(key: string): boolean { return this.columns.find(c => c.key === key)?.visible !== false; }
  toggleColumn(key: string, checked: boolean): void { const col = this.columns.find(c => c.key === key); if (!col || col.required) return; col.visible = checked; this.saveColumnsPreference(); }
  selecionarUsuario(u: User): void { this.selectedUser = this.selectedUser?.id === u.id ? null : u; }
  isSelected(u: User): boolean { return this.selectedUser?.id === u.id; }
  consultarSelecionado(): void { if (this.selectedUser) this.consultar(this.selectedUser); }
  editarSelecionado(): void { if (this.selectedUser && this.podeEditarModulo) this.editar(this.selectedUser); }
  excluirSelecionado(): void { if (this.selectedUser && this.podeExcluirModulo) this.excluir(this.selectedUser); }
  sessoesSelecionado(): void { if (this.selectedUser) this.abrirSessoes(this.selectedUser); }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  restoreViewPreference(): void { localStorage.removeItem(this.viewPrefsKey); localStorage.removeItem('sysvar.list.usuarios.pageSize'); this.indicatorsVisible = true; this.filtersVisible = true; this.pageSize = 20; this.columns = this.columns.map(c => ({ ...c, visible: true })); this.saveColumnsPreference(); this.load(); }
  @HostListener('window:sysvar-usuarios-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-usuarios-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-usuarios-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  lojaId(loja: Loja): number | null {
    return loja.id ?? loja.Idloja ?? null;
  }

  lojaNome(id: number | null | undefined): string {
    if (!id) return '-';
    const loja = this.lojas.find(l => this.lojaId(l) === id);
    return loja?.nome_loja || loja?.apelido_loja || `Loja #${id}`;
  }

  empresaNome(id: number | null | undefined): string {
    if (!id) return '-';
    const empresa = this.empresas.find(e => e.id === id);
    return empresa?.nome_fantasia || empresa?.nome || `Empresa #${id}`;
  }

  lojasDaEmpresa(): Loja[] {
    const empresaId = Number(this.form.getRawValue().Idempresa || 0);
    if (!empresaId) return [];
    return this.lojas.filter(l => Number(l.empresa || 0) === empresaId);
  }

  empresaSelecionadaId(): number | null {
    return this.form.getRawValue().Idempresa ?? null;
  }

  onEmpresaChange(): void {
    const permitidas = new Set(this.lojasDaEmpresa().map(l => this.lojaId(l)).filter((id): id is number => !!id));
    const lojaPrincipal = Number(this.form.value.Idloja || 0);
    if (lojaPrincipal && !permitidas.has(lojaPrincipal)) {
      this.form.patchValue({ Idloja: null });
    }
    const lojasSelecionadas = (this.form.value.Idlojas || []).filter((id: number) => permitidas.has(Number(id)));
    this.form.patchValue({ Idlojas: lojasSelecionadas });
    this.loadPerfis();
  }

  onPerfilChange(): void {
    this.aplicarPerfilSelecionado();
  }

  private perfilSelecionado(): PerfilAcesso | null {
    const id = Number(this.form.getRawValue().perfil_principal_id || 0);
    return this.perfis.find(p => Number(p.id) === id) ?? null;
  }

  private selecionarPerfilPadraoPorTipo(): void {
    if (!this.perfis.length || this.form.getRawValue().perfil_principal_id) return;
    const perfil = this.perfis.find(p => p.padrao) || this.perfis[0];
    if (perfil?.id) this.form.patchValue({ perfil_principal_id: perfil.id });
  }

  private aplicarPerfilSelecionado(): void {
    const perfil = this.perfilSelecionado();
    if (!perfil?.permissoes_modulos?.length) return;
    const perms = new Map(perfil.permissoes_modulos.map(p => [p.modulo_chave, p.acesso]));
    this.modulosPermissao = this.modulosPermissao.map(m => ({
      ...m,
      perfil: (perms.get(m.key) as any) || 'NONE',
      efetivo: m.acesso === 'HERDAR' ? ((perms.get(m.key) as any) || 'NONE') : m.acesso,
    }));
    this.normalizarPermissoesPorTipo();
  }

  private loadModulos(): void {
    this.accessApi.modulos().subscribe({
      next: (res: any) => {
        const disponiveis = new Set(this.usuarioAtual?.modulos_disponiveis_empresa || []);
        const modulos = (Array.isArray(res) ? res : (res?.results ?? []))
          .filter((m: any) => !disponiveis.size || disponiveis.has(m.chave));
        const atuais = new Map(this.modulosPermissao.map(m => [m.key, m]));
        this.modulosPermissao = modulos.map((m: any) => ({
          key: m.chave,
          label: m.nome,
          perfil: atuais.get(m.chave)?.perfil || 'NONE',
          acesso: atuais.get(m.chave)?.acesso || 'HERDAR',
          efetivo: atuais.get(m.chave)?.efetivo || 'NONE',
        }));
        this.aplicarPerfilSelecionado();
      },
      error: () => {
        this.modulosPermissao = [];
      }
    });
  }

  private loadIndicadores(): void {
    this.api.indicadores().subscribe({
      next: (data: any) => this.indicadoresApi = {
        total: Number(data?.total || 0),
        ativos: Number(data?.ativos || 0),
        inativos: Number(data?.inativos || 0),
        masters: Number(data?.masters || 0),
        com_sessao_ativa: Number(data?.com_sessao_ativa || 0),
      },
      error: () => {}
    });
  }

  onLojaPrincipalChange(): void {
    const lojaPrincipal = Number(this.form.value.Idloja || 0);
    if (!lojaPrincipal) return;
    const selecionadas = new Set(this.lojasPermitidasIds());
    selecionadas.add(lojaPrincipal);
    this.form.patchValue({ Idlojas: Array.from(selecionadas) });
  }

  lojasPermitidasIds(): number[] {
    return (this.form.value.Idlojas || []).map(id => Number(id)).filter(id => Number.isFinite(id));
  }

  lojaPermitidaMarcada(loja: Loja): boolean {
    const id = this.lojaId(loja);
    return !!id && this.lojasPermitidasIds().includes(id);
  }

  todasLojasMarcadas(): boolean {
    const lojas = this.lojasDaEmpresa().map(l => this.lojaId(l)).filter((id): id is number => !!id);
    const selecionadas = new Set(this.lojasPermitidasIds());
    return lojas.length > 0 && lojas.every(id => selecionadas.has(id));
  }

  toggleTodasLojas(checked: boolean): void {
    const ids = checked
      ? this.lojasDaEmpresa().map(l => this.lojaId(l)).filter((id): id is number => !!id)
      : [];
    this.form.patchValue({ Idlojas: ids });
  }

  toggleLojaPermitida(loja: Loja, checked: boolean): void {
    const id = this.lojaId(loja);
    if (!id) return;
    const selecionadas = new Set(this.lojasPermitidasIds());
    if (checked) {
      selecionadas.add(id);
    } else {
      selecionadas.delete(id);
    }
    this.form.patchValue({ Idlojas: Array.from(selecionadas) });
  }

  private normalize(value: any): string {
    return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }
  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.usuarios.pageSize'));
    if ([10, 20, 50, 100].includes(size)) this.pageSize = size;
    const raw = localStorage.getItem(this.columnsStorageKey);
    if (!raw) return;
    try { const saved = JSON.parse(raw) as Record<string, boolean>; this.columns = this.columns.map(c => c.required ? c : { ...c, visible: saved[c.key] ?? c.visible }); } catch {}
  }
  private saveColumnsPreference(): void { localStorage.setItem(this.columnsStorageKey, JSON.stringify(Object.fromEntries(this.columns.map(c => [c.key, c.visible])))); }
  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try { const pref = JSON.parse(raw) as { indicatorsVisible?: boolean; filtersVisible?: boolean }; this.indicatorsVisible = pref.indicatorsVisible !== false; this.filtersVisible = pref.filtersVisible !== false; } catch {}
  }
  private saveViewPreference(): void { localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible })); }

  abrirSessoes(user: User): void {
    if (!user.id) return;
    this.sessoesModalUser = user;
    this.carregarSessoesUsuario();
  }

  carregarSessoesUsuario(): void {
    const user = this.sessoesModalUser;
    if (!user?.id) return;
    this.sessoesLoading = true;
    this.api.sessoes(user.id).subscribe({
      next: (rows) => {
        this.sessoesUsuario = rows || [];
        this.sessoesLoading = false;
      },
      error: () => {
        this.sessoesUsuario = [];
        this.sessoesLoading = false;
        this.errorMsg = 'Falha ao carregar sessões do usuário.';
      }
    });
  }

  fecharSessoesUsuario(): void {
    this.sessoesModalUser = null;
    this.sessoesUsuario = [];
  }

  encerrarSessaoUsuario(sessao: SessaoUsuarioRow): void {
    if (!sessao?.id || !window.confirm('Encerrar esta sessão?')) return;
    this.sessionsApi.terminateSession(sessao.id).subscribe({
      next: () => {
        this.carregarSessoesUsuario();
        this.load();
        this.auth.refreshMe().subscribe({ error: () => {} });
      },
      error: () => this.errorMsg = 'Falha ao encerrar sessão.'
    });
  }

  encerrarTodasSessoesUsuario(): void {
    const user = this.sessoesModalUser;
    if (!user?.id || !window.confirm('Encerrar todas as sessões ativas deste usuário?')) return;
    this.api.encerrarSessoes(user.id).subscribe({
      next: () => {
        this.carregarSessoesUsuario();
        this.load();
        this.auth.refreshMe().subscribe({ error: () => {} });
      },
      error: () => this.errorMsg = 'Falha ao encerrar sessões.'
    });
  }

  exportarSessoesUsuarioCsv(): void {
    const header = ['Status', 'Empresa', 'Loja', 'Dispositivo', 'Device ID', 'Navegador', 'Sistema operacional', 'IP', 'Início', 'Última atividade', 'Heartbeat', 'Token válido', 'Token revogado', 'Motivo', 'Tempo conectado', 'Origem'];
    const rows = this.sessoesUsuario.map(s => [
      s.status, s.empresa_nome || '-', s.loja_nome || '-', s.dispositivo_id, s.dispositivo_id,
      s.navegador || '-', s.sistema_operacional || '-', s.ip || '-', s.iniciada_em, s.ultima_atividade_em,
      s.heartbeat || s.ultima_atividade_em, s.token_valido ? 'Sim' : 'Não', s.token_revogado ? 'Sim' : 'Não',
      s.motivo_encerramento || '-', this.tempoConectado(s), s.origem || '-',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessoes-${this.sessoesModalUser?.username || 'usuario'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  abrirAuditoriaSessao(sessao?: SessaoUsuarioRow): void {
    const query = sessao?.id ? { queryParams: { session_id: sessao.id } } : undefined;
    this.router.navigate(['/config/auditoria'], query);
  }

  sessoesIndicadores() {
    const ativas = this.sessoesUsuario.filter(s => s.status === 'ATIVA').length;
    const encerradas = this.sessoesUsuario.length - ativas;
    const dispositivos = new Set(this.sessoesUsuario.map(s => s.dispositivo_id).filter(Boolean)).size;
    const tempos = this.sessoesUsuario.map(s => Number(s.tempo_conectado_segundos || 0)).filter(v => v > 0);
    const medio = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;
    return { ativas, encerradas, dispositivos, tempoMedio: this.formatSeconds(medio) };
  }

  sessaoStatusClass(sessao: SessaoUsuarioRow): string {
    if (sessao.status === 'ATIVA') return 'active';
    if (sessao.status === 'REVOGADA') return 'revoked';
    if (sessao.status === 'EXPIRADA') return 'expired';
    return 'closed';
  }

  tempoConectado(sessao: SessaoUsuarioRow): string {
    return this.formatSeconds(Number(sessao.tempo_conectado_segundos || 0));
  }

  private formatSeconds(total: number): string {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${h}h ${m}m`;
  }
}
