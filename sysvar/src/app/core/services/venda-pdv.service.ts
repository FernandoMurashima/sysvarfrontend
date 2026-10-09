import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CupomPdv,
  FinalizarDevolucaoVendaPayload,
  FinalizarVendaPdvPayload,
  NFCeResumo,
  RelatorioMargem,
  RelatorioVendas,
  VendaDevolucao,
  VendaDevolucaoConsulta,
  VendaConsultaDetalhe,
  VendaConsultaPaginada,
  VendaPdv
} from '../models/venda-pdv';

@Injectable({ providedIn: 'root' })
export class VendaPdvService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/fiscal`;

  finalizar(payload: FinalizarVendaPdvPayload): Observable<VendaPdv> {
    return this.http.post<VendaPdv>(`${this.base}/vendas-pdv/finalizar/`, payload);
  }

  cupom(nfceId: number): Observable<CupomPdv> {
    return this.http.get<CupomPdv>(`${this.base}/nfce/${nfceId}/cupom/`);
  }

  nfceContingenciaPendente(params?: Record<string, string | number | null | undefined>): Observable<NFCeResumo[]> {
    const query: Record<string, string> = {};
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') query[key] = String(value);
    });
    return this.http.get<NFCeResumo[]>(`${this.base}/nfce/contingencia-pendente/`, { params: query });
  }

  relatorioVendas(params?: Record<string, string | number | null | undefined>): Observable<RelatorioVendas> {
    const query = this.queryParams(params);
    return this.http.get<RelatorioVendas>(`${this.base}/vendas-pdv/relatorio-vendas/`, { params: query });
  }

  consultaVendas(params?: Record<string, string | number | null | undefined>): Observable<VendaConsultaPaginada> {
    const query = this.queryParams(params);
    return this.http.get<VendaConsultaPaginada>(`${this.base}/vendas-pdv/consulta-vendas/`, { params: query });
  }

  consultaVendaDetalhe(id: number): Observable<VendaConsultaDetalhe> {
    return this.http.get<VendaConsultaDetalhe>(`${this.base}/vendas-pdv/${id}/consulta/`);
  }

  relatorioMargem(params?: Record<string, string | number | null | undefined>): Observable<RelatorioMargem> {
    const query = this.queryParams(params);
    return this.http.get<RelatorioMargem>(`${this.base}/vendas-pdv/relatorio-margem/`, { params: query });
  }

  vendasDevolviveis(params?: Record<string, string | number | null | undefined>): Observable<VendaDevolucaoConsulta[]> {
    const query: Record<string, string> = {};
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') query[key] = String(value);
    });
    return this.http.get<VendaDevolucaoConsulta[]>(`${this.base}/devolucoes-venda/vendas-devolviveis/`, { params: query });
  }

  buscarVendaParaDevolucao(documento: string, vendaId?: number): Observable<VendaDevolucaoConsulta> {
    const params: Record<string, string> = vendaId ? { venda: String(vendaId) } : { documento };
    return this.http.get<VendaDevolucaoConsulta>(`${this.base}/devolucoes-venda/buscar-venda/`, { params });
  }

  finalizarDevolucao(payload: FinalizarDevolucaoVendaPayload): Observable<VendaDevolucao> {
    return this.http.post<VendaDevolucao>(`${this.base}/devolucoes-venda/finalizar/`, payload);
  }

  private queryParams(params?: Record<string, string | number | null | undefined>): Record<string, string> {
    const query: Record<string, string> = {};
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') query[key] = String(value);
    });
    return query;
  }
}
