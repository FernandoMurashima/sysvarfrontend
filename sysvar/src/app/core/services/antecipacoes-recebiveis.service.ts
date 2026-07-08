import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AntecipacaoRecebivel, AntecipacaoResultado, RecebivelAntecipacao } from '../models/antecipacao-recebivel';

type ListResp = AntecipacaoRecebivel[] | { results: AntecipacaoRecebivel[]; count: number };

@Injectable({ providedIn: 'root' })
export class AntecipacoesRecebiveisService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/financeiro/antecipacoes-recebiveis/`;

  list(params?: Record<string, string | number | null | undefined>): Observable<ListResp> {
    return this.http.get<ListResp>(this.base, { params: this.params(params) });
  }

  recebiveis(params?: Record<string, string | number | null | undefined>): Observable<RecebivelAntecipacao[]> {
    return this.http.get<RecebivelAntecipacao[]>(`${this.base}recebiveis/`, { params: this.params(params) });
  }

  executar(payload: {
    movimentacoes: number[];
    data_antecipacao: string;
    taxa_percentual: number;
    documento?: string | null;
    observacao?: string | null;
  }): Observable<AntecipacaoResultado> {
    return this.http.post<AntecipacaoResultado>(`${this.base}executar/`, payload);
  }

  private params(params?: Record<string, string | number | null | undefined>): HttpParams {
    let p = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
    });
    return p;
  }
}
