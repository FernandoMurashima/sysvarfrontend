import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Promocao, PromocaoAplicavel } from '../models/promocao';

type ListResp<T> = T[] | { results: T[]; count: number };

@Injectable({ providedIn: 'root' })
export class PromocoesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto/promocao/`;

  list(params?: { ativo?: 'true' | 'false'; loja?: number | null }): Observable<ListResp<Promocao>> {
    let httpParams = new HttpParams();
    if (params?.ativo) httpParams = httpParams.set('ativo', params.ativo);
    if (params?.loja) httpParams = httpParams.set('loja', String(params.loja));
    return this.http.get<ListResp<Promocao>>(this.base, { params: httpParams });
  }

  create(payload: Partial<Promocao>): Observable<Promocao> {
    return this.http.post<Promocao>(this.base, payload);
  }

  update(id: number, payload: Partial<Promocao>): Observable<Promocao> {
    return this.http.put<Promocao>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}${id}/`);
  }

  aplicaveis(loja: number | null, produtos: number[]): Observable<{ results: PromocaoAplicavel[] }> {
    let params = new HttpParams();
    if (loja) params = params.set('loja', String(loja));
    if (produtos.length) params = params.set('produtos', produtos.join(','));
    return this.http.get<{ results: PromocaoAplicavel[] }>(`${this.base}aplicaveis/`, { params });
  }
}
