// src/app/core/services/formas-pagamento.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FormaPagamento, FormaPagamentoParcela } from '../models/forma-pagamento';

type ListResp = FormaPagamento[] | { results: FormaPagamento[]; count: number };

@Injectable({ providedIn: 'root' })
export class FormasPagamentoService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/financeiro/formas/`;
  private baseParcelas = `${environment.apiBaseUrl}/financeiro/formas-parcelas/`;

  // ===== Formas de pagamento =====

  list(params?: { ativo?: boolean; codigo?: string }): Observable<ListResp> {
    let httpParams = new HttpParams();
    if (typeof params?.ativo === 'boolean') {
      httpParams = httpParams.set('ativo', params.ativo ? 'true' : 'false');
    }
    if (params?.codigo) {
      httpParams = httpParams.set('codigo', params.codigo.trim());
    }
    return this.http.get<ListResp>(this.base, { params: httpParams });
  }

  get(id: number): Observable<FormaPagamento> {
    return this.http.get<FormaPagamento>(`${this.base}${id}/`);
  }

  create(payload: Partial<FormaPagamento>): Observable<FormaPagamento> {
    return this.http.post<FormaPagamento>(this.base, payload);
  }

  update(id: number, payload: Partial<FormaPagamento>): Observable<FormaPagamento> {
    return this.http.put<FormaPagamento>(`${this.base}${id}/`, payload);
  }

  patch(id: number, payload: Partial<FormaPagamento>): Observable<FormaPagamento> {
    return this.http.patch<FormaPagamento>(`${this.base}${id}/`, payload);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }

  // ===== Parcelas =====

  listParcelasByForma(formaId: number): Observable<FormaPagamentoParcela[]> {
    let params = new HttpParams().set('forma', String(formaId));
    return this.http.get<FormaPagamentoParcela[]>(this.baseParcelas, { params });
  }

  createParcela(payload: Partial<FormaPagamentoParcela>): Observable<FormaPagamentoParcela> {
    return this.http.post<FormaPagamentoParcela>(this.baseParcelas, payload);
  }

  updateParcela(id: number, payload: Partial<FormaPagamentoParcela>): Observable<FormaPagamentoParcela> {
    return this.http.put<FormaPagamentoParcela>(`${this.baseParcelas}${id}/`, payload);
  }

  deleteParcela(id: number): Observable<any> {
    return this.http.delete(`${this.baseParcelas}${id}/`);
  }
}
