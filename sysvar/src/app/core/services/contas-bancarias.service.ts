import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContaBancaria } from '../models/conta-bancaria';

type ListResp = ContaBancaria[] | { results: ContaBancaria[]; count: number };

@Injectable({ providedIn: 'root' })
export class ContasBancariasService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/financeiro/contas-bancarias/`;

  list(params?: { loja?: number; ativo?: boolean }): Observable<ListResp> {
    let p = new HttpParams();
    if (params?.loja) p = p.set('loja', String(params.loja));
    if (typeof params?.ativo === 'boolean') p = p.set('ativo', params.ativo ? 'true' : 'false');
    return this.http.get<ListResp>(this.base, { params: p });
  }

  create(payload: Partial<ContaBancaria>): Observable<ContaBancaria> {
    return this.http.post<ContaBancaria>(this.base, payload);
  }

  update(id: number, payload: Partial<ContaBancaria>): Observable<ContaBancaria> {
    return this.http.put<ContaBancaria>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
