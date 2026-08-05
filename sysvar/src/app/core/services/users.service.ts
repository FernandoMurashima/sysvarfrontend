import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/accounts/users/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number; [key: string]: any }): Observable<User[] | any> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') httpParams = httpParams.set(key, String(value));
    });
    return this.http.get<User[]>(this.base, { params: httpParams });
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(`${this.base}${id}/`);
  }

  create(payload: User): Observable<User> {
    return this.http.post<User>(this.base, payload);
  }

  update(id: number, payload: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }

  indicadores(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') httpParams = httpParams.set(key, String(value));
    });
    return this.http.get<any>(`${this.base}indicadores/`, { params: httpParams });
  }

  sessoes(id: number): Observable<any[]> { return this.http.get<any[]>(`${this.base}${id}/sessoes/`); }
  encerrarSessoes(id: number): Observable<any> { return this.http.post<any>(`${this.base}${id}/encerrar-sessoes/`, {}); }
  redefinirSenha(id: number, payload: { nova_senha: string; confirmacao: string; encerrar_sessoes?: boolean }): Observable<any> {
    return this.http.post<any>(`${this.base}${id}/redefinir-senha/`, payload);
  }
}
