import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  NotaFiscalEntrada,
} from '../models/nota-fiscal-entrada';
import {
  PaginatedResponse,
  TipoTratamentoXmlFornecedor,
  XmlFornecedorRecebido,
  XmlFornecedorRecebidoIndicadores,
  XmlFornecedorRecebidoListParams,
} from '../models/xml-fornecedor-recebido';

@Injectable({ providedIn: 'root' })
export class XmlFornecedorRecebidoService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/fiscal/xmls-fornecedor-recebidos/`;

  listar(params?: XmlFornecedorRecebidoListParams): Observable<XmlFornecedorRecebido[] | PaginatedResponse<XmlFornecedorRecebido>> {
    return this.http.get<XmlFornecedorRecebido[] | PaginatedResponse<XmlFornecedorRecebido>>(this.base, { params: this.params(params, true) });
  }

  indicadores(params?: XmlFornecedorRecebidoListParams): Observable<XmlFornecedorRecebidoIndicadores> {
    return this.http.get<XmlFornecedorRecebidoIndicadores>(`${this.base}indicadores/`, { params: this.params(params, false) });
  }

  get(id: number): Observable<XmlFornecedorRecebido> {
    return this.http.get<XmlFornecedorRecebido>(`${this.base}${id}/`);
  }

  definirTratamento(id: number, tipo_tratamento: TipoTratamentoXmlFornecedor): Observable<XmlFornecedorRecebido> {
    return this.http.post<XmlFornecedorRecebido>(`${this.base}${id}/definir-tratamento/`, { tipo_tratamento });
  }

  encaminharFiscal(id: number): Observable<NotaFiscalEntrada> {
    return this.http.post<NotaFiscalEntrada>(`${this.base}${id}/encaminhar-fiscal/`, {});
  }

  private params(params?: XmlFornecedorRecebidoListParams, includePaging = true): HttpParams {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (!includePaging && ['page', 'page_size'].includes(key)) return;
      if (value !== undefined && value !== null && value !== '') hp = hp.set(key, String(value));
    });
    return hp;
  }
}
