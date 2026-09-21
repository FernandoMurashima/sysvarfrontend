import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { HubSincronizacaoLoja, HubSincronizacaoSolicitacao, HubSincronizacaoTodasResultado } from '../models/hub-sincronizacao';

@Injectable({ providedIn: 'root' })
export class HubSincronizacaoService {
  private painelUrl = `${environment.apiBaseUrl}/hub/sincronizacoes/`;
  private solicitarUrl = `${environment.apiBaseUrl}/hub/sincronizacoes/solicitar/`;
  private todasUrl = `${environment.apiBaseUrl}/hub/sincronizacoes/todas/`;

  constructor(private http: HttpClient) {}

  listarPainel(): Observable<HubSincronizacaoLoja[]> {
    return this.http.get<HubSincronizacaoLoja[]>(this.painelUrl);
  }

  sincronizarLoja(lojaId: number): Observable<HubSincronizacaoSolicitacao> {
    return this.http.post<HubSincronizacaoSolicitacao>(this.solicitarUrl, { loja_id: lojaId });
  }

  sincronizarTodas(): Observable<HubSincronizacaoTodasResultado> {
    return this.http.post<HubSincronizacaoTodasResultado>(this.todasUrl, {});
  }
}
