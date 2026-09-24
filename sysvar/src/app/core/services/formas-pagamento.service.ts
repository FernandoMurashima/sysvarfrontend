// src/app/core/services/formas-pagamento.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Adquirente, CondicaoAdquirente, FormaPagamento, PrazoPagamento, PrazoPagamentoParcela } from '../models/forma-pagamento';

type ListResp = FormaPagamento[] | { results: FormaPagamento[]; count: number };
type PrazosListResp = PrazoPagamento[] | { results: PrazoPagamento[]; count: number };
type AdquirentesListResp = Adquirente[] | { results: Adquirente[]; count: number };
type CondicoesAdquirenteListResp = CondicaoAdquirente[] | { results: CondicaoAdquirente[]; count: number };

@Injectable({ providedIn: 'root' })
export class FormasPagamentoService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/financeiro/formas/`;
  private basePrazos = `${environment.apiBaseUrl}/financeiro/prazos/`;
  private basePrazosParcelas = `${environment.apiBaseUrl}/financeiro/prazos-parcelas/`;
  private baseAdquirentes = `${environment.apiBaseUrl}/financeiro/adquirentes/`;
  private baseCondicoesAdquirente = `${environment.apiBaseUrl}/financeiro/condicoes-adquirente/`;

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

  // ===== Prazos de pagamento =====

  listPrazos(params?: { ativo?: boolean; codigo?: string; finalidade?: 'PAGAR' | 'RECEBER' | 'AMBOS' }): Observable<PrazosListResp> {
    let httpParams = new HttpParams();
    if (typeof params?.ativo === 'boolean') {
      httpParams = httpParams.set('ativo', params.ativo ? 'true' : 'false');
    }
    if (params?.codigo) {
      httpParams = httpParams.set('codigo', params.codigo.trim());
    }
    if (params?.finalidade) {
      httpParams = httpParams.set('finalidade', params.finalidade);
    }
    return this.http.get<PrazosListResp>(this.basePrazos, { params: httpParams });
  }

  getPrazo(id: number): Observable<PrazoPagamento> {
    return this.http.get<PrazoPagamento>(`${this.basePrazos}${id}/`);
  }

  createPrazo(payload: Partial<PrazoPagamento>): Observable<PrazoPagamento> {
    return this.http.post<PrazoPagamento>(this.basePrazos, payload);
  }

  updatePrazo(id: number, payload: Partial<PrazoPagamento>): Observable<PrazoPagamento> {
    return this.http.put<PrazoPagamento>(`${this.basePrazos}${id}/`, payload);
  }

  deletePrazo(id: number): Observable<any> {
    return this.http.delete(`${this.basePrazos}${id}/`);
  }

  createPrazoParcela(payload: Partial<PrazoPagamentoParcela>): Observable<PrazoPagamentoParcela> {
    return this.http.post<PrazoPagamentoParcela>(this.basePrazosParcelas, payload);
  }

  listPrazosParcelasByPrazo(prazoId: number): Observable<PrazoPagamentoParcela[]> {
    const params = new HttpParams().set('prazo', String(prazoId));
    return this.http.get<PrazoPagamentoParcela[]>(this.basePrazosParcelas, { params });
  }

  updatePrazoParcela(id: number, payload: Partial<PrazoPagamentoParcela>): Observable<PrazoPagamentoParcela> {
    return this.http.put<PrazoPagamentoParcela>(`${this.basePrazosParcelas}${id}/`, payload);
  }

  deletePrazoParcela(id: number): Observable<any> {
    return this.http.delete(`${this.basePrazosParcelas}${id}/`);
  }

  // ===== Adquirentes =====

  listAdquirentes(params?: { ativo?: boolean; codigo?: string }): Observable<AdquirentesListResp> {
    let httpParams = new HttpParams();
    if (typeof params?.ativo === 'boolean') {
      httpParams = httpParams.set('ativo', params.ativo ? 'true' : 'false');
    }
    if (params?.codigo) {
      httpParams = httpParams.set('codigo', params.codigo.trim());
    }
    return this.http.get<AdquirentesListResp>(this.baseAdquirentes, { params: httpParams });
  }

  getAdquirente(id: number): Observable<Adquirente> {
    return this.http.get<Adquirente>(`${this.baseAdquirentes}${id}/`);
  }

  createAdquirente(payload: Partial<Adquirente>): Observable<Adquirente> {
    return this.http.post<Adquirente>(this.baseAdquirentes, payload);
  }

  updateAdquirente(id: number, payload: Partial<Adquirente>): Observable<Adquirente> {
    return this.http.put<Adquirente>(`${this.baseAdquirentes}${id}/`, payload);
  }

  deleteAdquirente(id: number): Observable<any> {
    return this.http.delete(`${this.baseAdquirentes}${id}/`);
  }

  // ===== Condições de adquirente =====

  listCondicoesAdquirente(params?: { ativo?: boolean; adquirente?: number; forma_pagamento?: number; prazo_pagamento?: number }): Observable<CondicoesAdquirenteListResp> {
    let httpParams = new HttpParams();
    if (typeof params?.ativo === 'boolean') httpParams = httpParams.set('ativo', params.ativo ? 'true' : 'false');
    if (params?.adquirente) httpParams = httpParams.set('adquirente', String(params.adquirente));
    if (params?.forma_pagamento) httpParams = httpParams.set('forma_pagamento', String(params.forma_pagamento));
    if (params?.prazo_pagamento) httpParams = httpParams.set('prazo_pagamento', String(params.prazo_pagamento));
    return this.http.get<CondicoesAdquirenteListResp>(this.baseCondicoesAdquirente, { params: httpParams });
  }

  getCondicaoAdquirente(id: number): Observable<CondicaoAdquirente> {
    return this.http.get<CondicaoAdquirente>(`${this.baseCondicoesAdquirente}${id}/`);
  }

  createCondicaoAdquirente(payload: Partial<CondicaoAdquirente>): Observable<CondicaoAdquirente> {
    return this.http.post<CondicaoAdquirente>(this.baseCondicoesAdquirente, payload);
  }

  updateCondicaoAdquirente(id: number, payload: Partial<CondicaoAdquirente>): Observable<CondicaoAdquirente> {
    return this.http.put<CondicaoAdquirente>(`${this.baseCondicoesAdquirente}${id}/`, payload);
  }

  deleteCondicaoAdquirente(id: number): Observable<any> {
    return this.http.delete(`${this.baseCondicoesAdquirente}${id}/`);
  }
}
