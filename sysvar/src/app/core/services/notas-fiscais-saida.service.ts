import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotaFiscalSaida } from '../models/nota-fiscal-saida';

type ListResp<T> = T[] | { results: T[]; count: number };

@Injectable({ providedIn: 'root' })
export class NotasFiscaisSaidaService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/fiscal/notas-saida/`;

  list(params?: Record<string, string | number | null | undefined>): Observable<ListResp<NotaFiscalSaida>> {
    return this.http.get<ListResp<NotaFiscalSaida>>(this.base, { params: this.params(params) });
  }

  get(id: number): Observable<NotaFiscalSaida> {
    return this.http.get<NotaFiscalSaida>(`${this.base}${id}/`);
  }

  autorizar(id: number): Observable<NotaFiscalSaida> {
    return this.http.post<NotaFiscalSaida>(`${this.base}${id}/autorizar/`, {});
  }

  private params(params?: Record<string, string | number | null | undefined>): HttpParams {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') hp = hp.set(key, String(value));
    });
    return hp;
  }
}
