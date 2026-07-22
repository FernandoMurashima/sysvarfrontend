import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TipoDespesaPdv } from '../models/tipo-despesa-pdv';

@Injectable({ providedIn: 'root' })
export class TipoDespesaPdvService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/financeiro/tipos-despesa-pdv/`;

  list(params?: Record<string, string | number | boolean | null | undefined>): Observable<TipoDespesaPdv[] | { results: TipoDespesaPdv[]; count: number }> {
    let p = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        p = p.set(key, String(value));
      }
    });
    return this.http.get<TipoDespesaPdv[] | { results: TipoDespesaPdv[]; count: number }>(this.base, { params: p });
  }
}
