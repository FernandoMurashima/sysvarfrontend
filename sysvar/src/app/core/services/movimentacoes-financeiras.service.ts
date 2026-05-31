import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MovimentacaoFinanceira } from '../models/movimentacao-financeira';

type ListResp = MovimentacaoFinanceira[] | { results: MovimentacaoFinanceira[]; count: number };

@Injectable({ providedIn: 'root' })
export class MovimentacoesFinanceirasService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/financeiro/movimentacoes/`;

  list(params?: Record<string, string | number | null | undefined>): Observable<ListResp> {
    let p = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
    });
    return this.http.get<ListResp>(this.base, { params: p });
  }

  create(payload: Partial<MovimentacaoFinanceira>): Observable<MovimentacaoFinanceira> {
    return this.http.post<MovimentacaoFinanceira>(this.base, payload);
  }

  update(id: number, payload: Partial<MovimentacaoFinanceira>): Observable<MovimentacaoFinanceira> {
    return this.http.put<MovimentacaoFinanceira>(`${this.base}${id}/`, payload);
  }

  cancelar(id: number): Observable<MovimentacaoFinanceira> {
    return this.http.post<MovimentacaoFinanceira>(`${this.base}${id}/cancelar/`, {});
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
