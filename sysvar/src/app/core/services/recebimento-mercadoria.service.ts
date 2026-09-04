import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PaginatedResponse, PedidoRecebimentoMercadoria, RecebimentoMercadoria } from '../models/recebimento-mercadoria';

@Injectable({ providedIn: 'root' })
export class RecebimentoMercadoriaService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/fiscal/recebimentos-mercadoria/`;

  listar(params?: Record<string, string | number | null | undefined>): Observable<PaginatedResponse<RecebimentoMercadoria> | RecebimentoMercadoria[]> {
    return this.http.get<PaginatedResponse<RecebimentoMercadoria> | RecebimentoMercadoria[]>(this.base, { params: this.params(params) });
  }

  get(id: number): Observable<RecebimentoMercadoria> {
    return this.http.get<RecebimentoMercadoria>(`${this.base}${id}/`);
  }

  iniciarPorXml(xmlFornecedor: number): Observable<RecebimentoMercadoria> {
    return this.http.post<RecebimentoMercadoria>(`${this.base}iniciar-por-xml/`, { xml_fornecedor: xmlFornecedor });
  }

  pedidosElegiveis(id: number): Observable<PedidoRecebimentoMercadoria[]> {
    return this.http.get<PedidoRecebimentoMercadoria[]>(`${this.base}${id}/pedidos-elegiveis/`);
  }

  vincularPedidos(id: number, pedidos: number[]): Observable<RecebimentoMercadoria> {
    return this.http.post<RecebimentoMercadoria>(`${this.base}${id}/vincular-pedidos/`, { pedidos });
  }

  gerarConferencia(id: number): Observable<RecebimentoMercadoria> {
    return this.http.post<RecebimentoMercadoria>(`${this.base}${id}/gerar-conferencia/`, {});
  }

  salvarConferencia(id: number, itens: Array<{ id: number; quantidade_recebida: string | number }>): Observable<RecebimentoMercadoria> {
    return this.http.post<RecebimentoMercadoria>(`${this.base}${id}/salvar-conferencia/`, { itens });
  }

  private params(params?: Record<string, string | number | null | undefined>): HttpParams {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') hp = hp.set(key, String(value));
    });
    return hp;
  }
}
