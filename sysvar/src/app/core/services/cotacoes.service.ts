import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cotacao, Paginated } from '../models/cotacao';

@Injectable({ providedIn: 'root' })
export class CotacoesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/compras/cotacoes/`;
  private lojasBase = `${environment.apiBaseUrl}/compras/requisicoes/lojas-permitidas/`;

  listar(params?: { loja?: number; status?: string; page?: number; page_size?: number }): Observable<Cotacao[] | Paginated<Cotacao>> {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') hp = hp.set(key, String(value));
    });
    return this.http.get<Cotacao[] | Paginated<Cotacao>>(this.base, { params: hp });
  }

  get(id: number): Observable<Cotacao> {
    return this.http.get<Cotacao>(`${this.base}${id}/`);
  }

  criar(payload: Partial<Cotacao>): Observable<Cotacao> {
    return this.http.post<Cotacao>(this.base, payload);
  }

  atualizar(id: number, payload: Partial<Cotacao>): Observable<Cotacao> {
    return this.http.patch<Cotacao>(`${this.base}${id}/`, payload);
  }

  lojasPermitidas(): Observable<any[] | Paginated<any>> {
    return this.http.get<any[] | Paginated<any>>(this.lojasBase);
  }
}
