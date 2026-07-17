import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import { UsersService } from '../../core/services/users.service';
import { User } from '../../core/models/user';

import { LojasService } from '../../core/services/lojas.service';
import { EmpresasService } from '../../core/services/empresas.service';
import { Empresa } from '../../core/models/empresa';

import {Router} from "@angular/router";
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

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
  acesso: 'NONE' | 'VIEW' | 'EDIT';
};

type CampoPermissao = {
  key: string;
  label: string;
  pode_ver: boolean;
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
  private successTimer: any = null;

  showForm = false;
  errorOverlayOpen = false;
  consultando = false;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('configuracoes', true) !== false;
  }

  get podeExcluirModulo(): boolean {
    return this.auth.podeExcluirModulo('configuracoes');
  }

  usuarios: User[] = [];
  empresas: Empresa[] = [];
  lojas: Loja[] = [];
  usuarioAtual: User | null = null;
  search = '';
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

  modulosPermissao: ModuloPermissao[] = [
    { key: 'cadastros', label: 'Cadastros', acesso: 'EDIT' },
    { key: 'produtos', label: 'Produtos', acesso: 'EDIT' },
    { key: 'fiscal', label: 'Fiscal', acesso: 'NONE' },
    { key: 'estoque', label: 'Estoque', acesso: 'EDIT' },
    { key: 'vendas', label: 'Vendas', acesso: 'EDIT' },
    { key: 'compras', label: 'Compras', acesso: 'EDIT' },
    { key: 'producao', label: 'Produção', acesso: 'NONE' },
    { key: 'financeiro', label: 'Financeiro', acesso: 'NONE' },
    { key: 'relatorios', label: 'Relatórios', acesso: 'VIEW' },
    { key: 'configuracoes', label: 'Configurações', acesso: 'VIEW' },
  ];

  camposPermissao: CampoPermissao[] = [
    { key: 'funcionario.salario', label: 'Ver salário de funcionários', pode_ver: false },
    { key: 'produto.custo', label: 'Ver custos e margens de produtos', pode_ver: false },
  ];

  form = this.fb.group({
    username: ['', [Validators.required, Validators.maxLength(150), this.usernameValidator]],
    first_name: [''],
    last_name: [''],
    email: ['', [Validators.email]],
    type: ['Regular', [Validators.required]],
    Idempresa: [null as number | null],
    Idloja: [null as number | null],
    Idlojas: [[] as number[]],
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
    this.loadUsuarioAtual();
    this.load();
    this.loadLojas();
  }

  get isSuperUsuario(): boolean { return this.usuarioAtual?.is_superuser === true; }
  get empresaBloqueada(): boolean { return !!this.usuarioAtual && !this.isSuperUsuario; }
  get usuarioFormularioAdmin(): boolean {
    return this.form.getRawValue().type === 'Admin';
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
    this.lojasApi.list({ ordering: 'nome_loja', page_size: 2000 }).subscribe({
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
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list({ search: this.search, ordering: '-id' }).subscribe({
      next: (data) => { this.usuarios = Array.isArray(data) ? data : (data as any).results ?? []; },
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
    const pwd = (raw.password ?? '').trim();
    if (pwd) payload.password = pwd;
    payload.permissoes_modulos = this.modulosPermissao.map(m => ({
      modulo: m.key,
      acesso: m.acesso,
    }));
    payload.permissoes_campos = this.camposPermissao.map(c => ({
      campo: c.key,
      pode_ver: c.pode_ver,
    }));
    return payload;
  }

  private resetPermissoes(): void {
    const padrao: Record<string, 'NONE' | 'VIEW' | 'EDIT'> = {
      cadastros: 'EDIT',
      produtos: 'EDIT',
      fiscal: 'NONE',
      estoque: 'EDIT',
      vendas: 'EDIT',
      compras: 'EDIT',
      producao: 'NONE',
      financeiro: 'NONE',
      relatorios: 'VIEW',
      configuracoes: 'VIEW',
    };
    this.modulosPermissao = this.modulosPermissao.map(m => ({ ...m, acesso: padrao[m.key] || 'NONE' }));
    this.camposPermissao = this.camposPermissao.map(c => ({ ...c, pode_ver: false }));
    this.normalizarPermissoesPorTipo();
  }

  private aplicarPermissoesUsuario(item: User): void {
    const modulos = new Map((item.permissoes_modulos || []).map(p => [p.modulo, p.acesso]));
    this.modulosPermissao = this.modulosPermissao.map(m => ({
      ...m,
      acesso: (modulos.get(m.key) as any) || m.acesso,
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
    if (this.usuarioFormularioAdmin) return;
    this.modulosPermissao = this.modulosPermissao.map(m => ({
      ...m,
      acesso: m.acesso === 'EDIT' ? 'VIEW' : m.acesso,
    }));
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

  fecharExclusao(): void {
    this.excluirModal = null;
  }

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
}
