import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlanoContabil } from '../models/plano-contabil';

type ListResp = PlanoContabil[] | { results: PlanoContabil[]; count: number };

@Injectable({ providedIn: 'root' })
export class PlanoContabilService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/cadastros/plano-contabil/`;

  list(params?: Record<string, string | number | boolean | null | undefined>): Observable<ListResp> {
    let p = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
    });
    return this.http.get<ListResp>(this.base, { params: p });
  }

  create(payload: Partial<PlanoContabil>): Observable<PlanoContabil> {
    return this.http.post<PlanoContabil>(this.base, payload);
  }

  update(id: number, payload: Partial<PlanoContabil>): Observable<PlanoContabil> {
    return this.http.put<PlanoContabil>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
