import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CodigoAtivacaoAgenteLocal } from '../models/agente-local';

@Injectable({ providedIn: 'root' })
export class AgenteLocalService {
  private baseUrl = `${environment.apiBaseUrl}/fiscal/agente-local/ativacoes/`;

  constructor(private http: HttpClient) {}

  gerarCodigoAtivacao(): Observable<CodigoAtivacaoAgenteLocal> {
    return this.http.post<CodigoAtivacaoAgenteLocal>(this.baseUrl, {});
  }
}
