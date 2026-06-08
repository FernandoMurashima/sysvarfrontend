import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CashbackConfig, CashbackMovimento, CashbackSaldo } from '../models/cashback';

@Injectable({ providedIn: 'root' })
export class CashbackService {
  private http = inject(HttpClient);
  private configBase = `${environment.apiBaseUrl}/financeiro/cashback-config/`;
  private movimentosBase = `${environment.apiBaseUrl}/financeiro/cashback-movimentos/`;

  configAtiva(): Observable<CashbackConfig> {
    return this.http.get<CashbackConfig>(`${this.configBase}ativa/`);
  }

  salvarConfig(config: Partial<CashbackConfig>): Observable<CashbackConfig> {
    const id = config.Idcashbackconfig;
    if (id) return this.http.put<CashbackConfig>(`${this.configBase}${id}/`, config);
    return this.http.post<CashbackConfig>(this.configBase, config);
  }

  movimentos(params?: {
    cliente?: number | null;
    tipo?: string;
    status?: string;
    data_ini?: string;
    data_fim?: string;
  }): Observable<CashbackMovimento[] | { results: CashbackMovimento[]; count: number }> {
    let httpParams = new HttpParams();
    if (params?.cliente) httpParams = httpParams.set('cliente', String(params.cliente));
    if (params?.tipo) httpParams = httpParams.set('tipo', params.tipo);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.data_ini) httpParams = httpParams.set('data_ini', params.data_ini);
    if (params?.data_fim) httpParams = httpParams.set('data_fim', params.data_fim);
    return this.http.get<CashbackMovimento[] | { results: CashbackMovimento[]; count: number }>(this.movimentosBase, { params: httpParams });
  }

  saldo(cliente: number): Observable<CashbackSaldo> {
    const params = new HttpParams().set('cliente', String(cliente));
    return this.http.get<CashbackSaldo>(`${this.movimentosBase}saldo/`, { params });
  }
}
