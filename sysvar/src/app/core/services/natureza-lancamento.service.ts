import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NatLancamento } from '../models/natureza-lancamento';

@Injectable({ providedIn: 'root' })
export class NatLancamentosService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/cadastros/nat_lancamento/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<any> {
    let p = new HttpParams();
    if (params?.search)    p = p.set('search', params.search);
    if (params?.ordering)  p = p.set('ordering', params.ordering);
    if (params?.page)      p = p.set('page', String(params.page));
    if (params?.page_size) p = p.set('page_size', String(params.page_size));
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
