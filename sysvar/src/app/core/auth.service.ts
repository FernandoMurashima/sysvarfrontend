// src/app/core/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface TokenResponse { token: string; user?: MeResponse; }
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
  permissoes_modulos?: Array<{ modulo: string; acesso: 'NONE' | 'VIEW' | 'EDIT' }>;
  permissoes_campos?: Array<{ campo: string; pode_ver: boolean }>;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private tokenKey = 'auth_token';
  private userTypeKey = 'user_type';
  private userNameKey = 'user_name';
  private currentUserKey = 'current_user';

  get api() { return environment.apiBaseUrl; }
  get apiBaseUrl() { return environment.apiBaseUrl; }

  login(username: string, password: string) {
    return this.http.post<TokenResponse>(`${this.api}/auth/token/`, { username, password })
      .pipe(
        tap(res => {
          this.setToken(res.token);
          if (res.user) {
            this.setUserType(res.user.type || 'Regular');
            this.setUserName(res.user.username || '');
            this.setCurrentUser(res.user);
          }
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
      .pipe(tap(() => this.clearToken()));
  }

  me() {
    return this.http.get<MeResponse>(`${this.api}/me/`);
  }

  // --- token helpers (sessionStorage) ---
  setToken(token: string) { sessionStorage.setItem(this.tokenKey, token); }
  getToken() { return sessionStorage.getItem(this.tokenKey); }
  clearToken() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userTypeKey);
    sessionStorage.removeItem(this.userNameKey);
    sessionStorage.removeItem(this.currentUserKey);
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

  empresaModuloHabilitado(modulo: 'cadastros' | 'produtos' | 'vendas' | 'compras' | 'estoque' | 'financeiro' | 'fiscal' | 'producao' | 'relatorios' | 'configuracoes'): boolean {
    const user = this.getCurrentUser();
    if (user?.is_superuser) return true;
    if (['cadastros', 'produtos', 'relatorios', 'configuracoes'].includes(modulo)) return true;
    const empresa = user?.empresa;
    if (!empresa) return false;
    if (empresa.licenca_master === true) return true;
    const campo = `usa_${modulo}` as keyof NonNullable<MeResponse['empresa']>;
    return empresa[campo] === true;
  }

  permissaoModulo(modulo?: string | null): 'NONE' | 'VIEW' | 'EDIT' | null {
    if (!modulo) return null;
    const user = this.getCurrentUser();
    if (user?.is_superuser) return 'EDIT';
    const perm = user?.permissoes_modulos?.find(p => p.modulo === modulo);
    return perm?.acesso ?? null;
  }

  podeAcessarModulo(modulo?: string | null, escrita = false): boolean | null {
    const acesso = this.permissaoModulo(modulo);
    if (acesso === null) return null;
    if (acesso === 'NONE') return false;
    if (escrita) return acesso === 'EDIT';
    return acesso === 'VIEW' || acesso === 'EDIT';
  }

  permissaoCampo(campo: string): boolean | null {
    const user = this.getCurrentUser();
    if (user?.is_superuser) return true;
    const perm = user?.permissoes_campos?.find(p => p.campo === campo);
    return perm ? !!perm.pode_ver : null;
  }
}
