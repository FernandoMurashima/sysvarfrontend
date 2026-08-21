// src/app/core/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DeviceService } from './services/device.service';
import { SessionService } from './services/session.service';

interface TokenResponse { token: string; session_id?: string; deve_trocar_senha?: boolean; user?: MeResponse; }
interface MeResponse {
  id: number; username: string; first_name: string; last_name: string; email: string; type: string;
  Idempresa?: number | null;
  empresa?: {
    id: number;
    nome: string;
    nome_fantasia?: string | null;
    licenca_master?: boolean;
    usa_vendas?: boolean;
    usa_compras?: boolean;
    usa_estoque?: boolean;
    usa_financeiro?: boolean;
    usa_fiscal?: boolean;
    usa_producao?: boolean;
    usa_ficha_tecnica?: boolean;
    usa_faccao?: boolean;
    usa_distribuicao_producao?: boolean;
  } | null;
  is_staff?: boolean;
  is_superuser?: boolean;
  deve_trocar_senha?: boolean;
  permissoes_modulos?: Array<{ modulo: string; acesso: 'NONE' | 'VIEW' | 'EDIT' }>;
  permissoes_campos?: Array<{ campo: string; pode_ver: boolean }>;
  is_platform_superuser?: boolean;
  is_company_master?: boolean;
  contrato?: {
    status: string;
    data_inicio: string;
    data_fim?: string | null;
    limite_usuarios: number;
    limite_sessoes_simultaneas: number;
    usuarios_ativos: number;
    sessoes_ativas: number;
    licencas_disponiveis: number;
    sessoes_disponiveis: number;
    excedido: boolean;
    limite_excedido: boolean;
    plano_completo: boolean;
    permissions_version: number;
  } | null;
  sessao_atual?: { session_id: string; dispositivo_id: string; iniciada_em: string; ultima_atividade_em: string } | null;
  modulos_disponiveis_empresa?: string[];
  permissoes_efetivas?: Record<string, 'NONE' | 'VIEW' | 'EDIT'>;
  permissoes_processos?: Record<string, boolean>;
}

export type ModuloEmpresa =
  | 'operacional'
  | 'cadastros'
  | 'produtos'
  | 'vendas'
  | 'compras'
  | 'requisicoes'
  | 'requisicoes_analise'
  | 'requisicoes_atendimento'
  | 'requisicoes_todas'
  | 'estoque'
  | 'distribuicao'
  | 'financeiro'
  | 'fiscal'
  | 'fiscal_contabil'
  | 'producao'
  | 'relatorios'
  | 'configuracoes'
  | 'auditoria';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private device = inject(DeviceService);
  private sessions = inject(SessionService);

  private tokenKey = 'auth_token';
  private sessionKey = 'access_session_id';
  private userTypeKey = 'user_type';
  private userNameKey = 'user_name';
  private currentUserKey = 'current_user';

  constructor() {
    window.addEventListener('storage', (event) => {
      if (event.key === 'sysvar_logout_event') this.handleUnauthorized();
    });
  }

  get api() { return environment.apiBaseUrl; }
  get apiBaseUrl() { return environment.apiBaseUrl; }

  login(username: string, password: string) {
    return this.http.post<TokenResponse>(`${this.api}/auth/token/`, { username, password, device_id: this.device.getDeviceId() })
      .pipe(
        tap(res => {
          this.setToken(res.token);
          if (res.session_id) sessionStorage.setItem(this.sessionKey, res.session_id);
          if (res.user) {
            this.setUserType(res.user.type || 'Regular');
            this.setUserName(res.user.username || '');
            this.setCurrentUser(res.user);
          }
          this.startHeartbeat();
        }),
        tap((res) => {
          if (res.user) return;
          // após salvar o token, busca /me para armazenar tipo e nome
          this.me().subscribe({
            next: me => {
              this.setUserType(me.type || 'Regular');
              this.setUserName(me.username || '');
              this.setCurrentUser(me);
            },
            error: () => {
              this.setUserType('Regular');
              this.setUserName('');
            }
          });
        })
      );
  }

  logout() {
    const token = this.getToken();
    if (!token) {
      this.clearToken();
      return this.http.post(`${this.api}/auth/logout/`, {});
    }
    return this.http.post(`${this.api}/auth/logout/`, {}, { headers: { Authorization: `Token ${token}` } })
      .pipe(finalize(() => this.clearToken()));
  }

  me() {
    return this.http.get<MeResponse>(`${this.api}/me/`);
  }

  changeRequiredPassword(payload: { senha_atual: string; nova_senha: string; confirmacao: string }) {
    return this.http.post<{ deve_trocar_senha: boolean }>(`${this.api}/accounts/change-required-password/`, payload);
  }

  // --- token helpers (sessionStorage) ---
  setToken(token: string) { sessionStorage.setItem(this.tokenKey, token); }
  getToken() { return sessionStorage.getItem(this.tokenKey); }
  clearToken() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.sessionKey);
    sessionStorage.removeItem(this.userTypeKey);
    sessionStorage.removeItem(this.userNameKey);
    sessionStorage.removeItem(this.currentUserKey);
    this.sessions.stopHeartbeat();
    localStorage.setItem('sysvar_logout_event', String(Date.now()));
  }
  isAuthenticated() { return !!this.getToken(); }

  // --- user type/name helpers (para topo/permissions) ---
  setUserType(type: string) { sessionStorage.setItem(this.userTypeKey, type); }

  // getUserType(): string | null { return sessionStorage.getItem(this.userTypeKey); }

  getUserType(): string | null {
  const v = sessionStorage.getItem(this.userTypeKey);
  if (!v) return null;

  const t = v.toLowerCase().trim();
  if (t === 'admin' || t === 'administrador') return 'Admin';
  if (t === 'diretor' || t === 'diretoria') return 'Diretor';
  if (t === 'gerente' || t === 'manager') return 'Gerente';
  if (t === 'caixa') return 'Caixa';
  if (t === 'vendedor' || t === 'vendas') return 'Vendedor';
  if (t === 'assistente receber' || t === 'assistente contas a receber' || t === 'assistentereceber') return 'AssistenteReceber';
  if (t === 'assistente pagar' || t === 'assistente contas a pagar' || t === 'assistentepagar') return 'AssistentePagar';
  if (t === 'regular' || t === 'user' || t === 'usuário' || t === 'usuario') return 'Regular';

  return v;
}


  setUserName(username: string) { sessionStorage.setItem(this.userNameKey, username); }
  getUserName(): string | null { return sessionStorage.getItem(this.userNameKey); }

  setCurrentUser(user: MeResponse) { sessionStorage.setItem(this.currentUserKey, JSON.stringify(user)); }
  getCurrentUser(): MeResponse | null {
    const raw = sessionStorage.getItem(this.currentUserKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MeResponse;
    } catch {
      return null;
    }
  }

  empresaModuloHabilitado(modulo: ModuloEmpresa): boolean {
    const user = this.getCurrentUser();
    if (user?.is_superuser || user?.is_platform_superuser) return true;
    return (user?.modulos_disponiveis_empresa || []).includes(modulo);
  }

  permissaoModulo(modulo?: string | null): 'NONE' | 'VIEW' | 'EDIT' | null {
    if (!modulo) return null;
    const user = this.getCurrentUser();
    if (user?.is_superuser) return 'EDIT';
    if (user?.permissoes_efetivas && modulo in user.permissoes_efetivas) return user.permissoes_efetivas[modulo];
    return 'NONE';
  }

  podeAcessarModulo(modulo?: string | null, escrita = false): boolean | null {
    const acesso = this.permissaoModulo(modulo);
    if (acesso === 'NONE') return false;
    if (escrita) return acesso === 'EDIT';
    return acesso === 'VIEW' || acesso === 'EDIT';
  }

  handleUnauthorized(): void {
    this.clearToken();
    this.router.navigateByUrl('/login');
  }

  startHeartbeat(): void {
    if (!this.getToken()) return;
    this.sessions.startHeartbeat(() => this.handleUnauthorized());
  }

  refreshMe() {
    return this.me().pipe(tap(me => {
      this.setUserType(me.type || 'Regular');
      this.setUserName(me.username || '');
      this.setCurrentUser(me);
      this.startHeartbeat();
    }));
  }

  isAdministrador(): boolean {
    const user = this.getCurrentUser();
    const tipo = (user?.type || this.getUserType() || '').toString().toLowerCase().trim();
    return user?.is_superuser === true || tipo === 'admin' || tipo === 'administrador';
  }

  podeExcluirModulo(modulo?: string | null): boolean {
    const user = this.getCurrentUser();
    if (user?.is_superuser || user?.is_company_master) return true;
    return Boolean(user?.permissoes_processos?.[`modulo.${modulo}.excluir`]) && this.podeAcessarModulo(modulo, true) === true;
  }

  permissaoCampo(campo: string): boolean | null {
    const user = this.getCurrentUser();
    if (user?.is_superuser) return true;
    if (user?.is_company_master) return true;
    return user?.permissoes_processos?.[campo] ?? null;
  }
}
