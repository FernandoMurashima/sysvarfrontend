// src/app/core/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface TokenResponse { token: string; user?: MeResponse; }
interface MeResponse {
  id: number; username: string; first_name: string; last_name: string; email: string; type: string;
  Idempresa?: number | null;
  empresa?: { id: number; nome: string; nome_fantasia?: string | null } | null;
  is_staff?: boolean;
  is_superuser?: boolean;
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
}
