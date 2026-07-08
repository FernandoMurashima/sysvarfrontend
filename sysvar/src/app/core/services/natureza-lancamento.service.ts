import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NatLancamento } from '../models/natureza-lancamento';

@Injectable({ providedIn: 'root' })
export class NatLancamentosService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/cadastros/nat_lancamento/`;

  list(params?: Record<string, string | number | boolean | null | undefined>): Observable<any> {
    let p = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        p = p.set(key, String(value));
      }
    });
    return this.http.get(this.base, { params: p });
  }

  get(id: number): Observable<NatLancamento> {
    return this.http.get<NatLancamento>(`${this.base}${id}/`);
  }

  create(payload: NatLancamento): Observable<NatLancamento> {
    return this.http.post<NatLancamento>(this.base, payload);
  }

  update(id: number, payload: NatLancamento): Observable<NatLancamento> {
    return this.http.put<NatLancamento>(`${this.base}${id}/`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
