import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Empresa } from '../models/empresa';

type ListResp = Empresa[] | { results: Empresa[]; count: number };

@Injectable({ providedIn: 'root' })
export class EmpresasService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/cadastros/empresas/`;

  list(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Observable<ListResp> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.ordering) httpParams = httpParams.set('ordering', params.ordering);
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.page_size) httpParams = httpParams.set('page_size', String(params.page_size));
    return this.http.get<ListResp>(this.base, { params: httpParams });
  }

  get(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.base}${id}/`);
  }

  create(payload: Partial<Empresa>): Observable<Empresa> {
    return this.http.post<Empresa>(this.base, payload);
  }

  update(id: number, payload: Partial<Empresa>): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<Empresa>): Observable<Empresa> {
    return this.http.patch<Empresa>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}${id}/`);
  }
}
