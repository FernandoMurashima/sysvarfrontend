import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  HubAdministracaoAcaoResultado,
  HubAtivacaoAdmin,
  HubAtivacaoCriada,
  HubSincronizacaoLoja,
  HubSincronizacaoSolicitacao,
  HubSincronizacaoTodasResultado,
} from '../models/hub-sincronizacao';

@Injectable({ providedIn: 'root' })
export class HubSincronizacaoService {
  private administracaoUrl = `${environment.apiBaseUrl}/hub/administracao/`;
  private ativacoesUrl = `${environment.apiBaseUrl}/hub/ativacoes/`;
  private solicitarUrl = `${environment.apiBaseUrl}/hub/sincronizacoes/solicitar/`;
  private todasUrl = `${environment.apiBaseUrl}/hub/sincronizacoes/todas/`;

  constructor(private http: HttpClient) {}

  listarPainel(): Observable<HubSincronizacaoLoja[]> {
    return this.listarAdministracao();
  }

  listarAdministracao(): Observable<HubSincronizacaoLoja[]> {
    return this.http.get<HubSincronizacaoLoja[]>(this.administracaoUrl);
  }

  listarAtivacoes(): Observable<HubAtivacaoAdmin[]> {
    return this.http.get<HubAtivacaoAdmin[]>(this.ativacoesUrl);
  }

  gerarAtivacao(lojaId: number): Observable<HubAtivacaoCriada> {
    return this.http.post<HubAtivacaoCriada>(this.ativacoesUrl, { loja_id: lojaId });
  }

  revogarAtivacao(ativacaoId: number): Observable<HubAtivacaoAdmin> {
    return this.http.post<HubAtivacaoAdmin>(`${this.ativacoesUrl}${ativacaoId}/revogar/`, {});
  }

  desativarHub(hubId: number): Observable<HubAdministracaoAcaoResultado> {
    return this.http.post<HubAdministracaoAcaoResultado>(`${this.administracaoUrl}${hubId}/desativar/`, {});
  }

  reativarHub(hubId: number): Observable<HubAdministracaoAcaoResultado> {
    return this.http.post<HubAdministracaoAcaoResultado>(`${this.administracaoUrl}${hubId}/reativar/`, {});
  }

  desvincularHub(hubId: number): Observable<HubAdministracaoAcaoResultado> {
    return this.http.post<HubAdministracaoAcaoResultado>(`${this.administracaoUrl}${hubId}/desvincular/`, {});
  }

  sincronizarLoja(lojaId: number): Observable<HubSincronizacaoSolicitacao> {
    return this.http.post<HubSincronizacaoSolicitacao>(this.solicitarUrl, { loja_id: lojaId });
  }

  sincronizarTodas(): Observable<HubSincronizacaoTodasResultado> {
    return this.http.post<HubSincronizacaoTodasResultado>(this.todasUrl, {});
  }
}
