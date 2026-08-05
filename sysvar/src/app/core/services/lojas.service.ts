import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Loja } from '../models/loja';

type ListResp = Loja[] | { results: Loja[]; count: number };

@Injectable({ providedIn: 'root' })
export class LojasService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/cadastros/lojas/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number; [key: string]: any }): Observable<ListResp> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') httpParams = httpParams.set(key, String(value));
    });
    return this.http.get<ListResp>(this.base, { params: httpParams });
  }

  get(id: number): Observable<Loja> {
    return this.http.get<Loja>(`${this.base}${id}/`);
  }

  create(payload: Partial<Loja>): Observable<Loja> {
    return this.http.post<Loja>(this.base, payload);
  }

  update(id: number, payload: Partial<Loja>): Observable<Loja> {
    return this.http.put<Loja>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Loja>): Observable<Loja> {
    return this.http.patch<Loja>(`${this.base}${id}/`, payload);
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

  ativar(id: number): Observable<Loja> { return this.http.post<Loja>(`${this.base}${id}/ativar/`, {}); }
  inativar(id: number): Observable<any> { return this.http.post<any>(`${this.base}${id}/inativar/`, {}); }
  encerrar(id: number, payload: { data: string; motivo: string }): Observable<Loja> { return this.http.post<Loja>(`${this.base}${id}/encerrar/`, payload); }
  reabrir(id: number): Observable<Loja> { return this.http.post<Loja>(`${this.base}${id}/reabrir/`, {}); }
  usuarios(id: number): Observable<any[]> { return this.http.get<any[]>(`${this.base}${id}/usuarios/`); }
}
