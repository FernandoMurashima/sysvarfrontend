import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AgenteLocalSysvar,
  CodigoAtivacaoAgenteLocal,
  ConfiguracaoXmlFornecedor,
  ConfiguracaoXmlFornecedorPayload,
} from '../models/agente-local';

type ListResp<T> = T[] | { results: T[]; count: number };

@Injectable({ providedIn: 'root' })
export class AgenteLocalService {
  private ativacoesUrl = `${environment.apiBaseUrl}/fiscal/agente-local/ativacoes/`;
  private agentesUrl = `${environment.apiBaseUrl}/fiscal/agentes-locais/`;
  private configuracoesUrl = `${environment.apiBaseUrl}/fiscal/configuracoes-xml-fornecedor/`;

  constructor(private http: HttpClient) {}

  gerarCodigoAtivacao(): Observable<CodigoAtivacaoAgenteLocal> {
    return this.http.post<CodigoAtivacaoAgenteLocal>(this.ativacoesUrl, {});
  }

  listarAgentes(): Observable<ListResp<AgenteLocalSysvar>> {
    return this.http.get<ListResp<AgenteLocalSysvar>>(this.agentesUrl);
  }

  listarConfiguracoes(): Observable<ListResp<ConfiguracaoXmlFornecedor>> {
    return this.http.get<ListResp<ConfiguracaoXmlFornecedor>>(this.configuracoesUrl);
  }

  criarConfiguracao(payload: ConfiguracaoXmlFornecedorPayload): Observable<ConfiguracaoXmlFornecedor> {
    return this.http.post<ConfiguracaoXmlFornecedor>(this.configuracoesUrl, payload);
  }

  atualizarConfiguracao(id: number, payload: Partial<ConfiguracaoXmlFornecedorPayload>): Observable<ConfiguracaoXmlFornecedor> {
    return this.http.patch<ConfiguracaoXmlFornecedor>(`${this.configuracoesUrl}${id}/`, payload);
  }
}
