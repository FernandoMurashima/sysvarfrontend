import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConsultaFinanceiraNatureza } from '../models/consulta-financeira-natureza';
import { DreGerencial } from '../models/dre-gerencial';
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

  consultaNaturezas(params?: Record<string, string | number | null | undefined>): Observable<ConsultaFinanceiraNatureza> {
    let p = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
    });
    return this.http.get<ConsultaFinanceiraNatureza>(`${this.base}consulta-naturezas/`, { params: p });
  }

  dre(params?: Record<string, string | number | null | undefined>): Observable<DreGerencial> {
    let p = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
    });
    return this.http.get<DreGerencial>(`${this.base}dre/`, { params: p });
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

  conciliar(id: number, payload: { data_conciliacao: string; valor_conciliado: number }): Observable<MovimentacaoFinanceira> {
    return this.http.post<MovimentacaoFinanceira>(`${this.base}${id}/conciliar/`, payload);
  }

  pendentesConciliacao(params: {
    data_movimento: string;
    forma_pagamento: string;
    conta_bancaria?: number | null;
  }): Observable<MovimentacaoFinanceira[]> {
    let p = new HttpParams()
      .set('data_movimento', params.data_movimento)
      .set('forma_pagamento', params.forma_pagamento);
    if (params.conta_bancaria) p = p.set('conta_bancaria', String(params.conta_bancaria));
    return this.http.get<MovimentacaoFinanceira[]>(`${this.base}pendentes-conciliacao/`, { params: p });
  }

  conciliarLote(payload: {
    ids: number[];
    data_conciliacao: string;
    valores?: Record<string, number>;
  }): Observable<{ quantidade: number; total: string; movimentacoes: MovimentacaoFinanceira[] }> {
    return this.http.post<{ quantidade: number; total: string; movimentacoes: MovimentacaoFinanceira[] }>(
      `${this.base}conciliar-lote/`,
      payload
    );
  }

  desfazerConciliacao(id: number): Observable<MovimentacaoFinanceira> {
    return this.http.post<MovimentacaoFinanceira>(`${this.base}${id}/desfazer-conciliacao/`, {});
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
