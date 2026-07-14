import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConfigFinanceira {
  id?: number;
  empresa?: number;
  natureza_juros_pagos?: number | null;
  natureza_juros_recebidos?: number | null;
  natureza_tarifas_pagas?: number | null;
  natureza_multas_pagas?: number | null;
  natureza_multas_recebidas?: number | null;
  natureza_descontos_concedidos?: number | null;
  natureza_descontos_obtidos?: number | null;
  atualizado_em?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigFinanceiraService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/financeiro/config-financeira/`;

  atual(): Observable<ConfigFinanceira> {
    return this.http.get<ConfigFinanceira>(`${this.base}atual/`);
  }

  salvar(payload: Partial<ConfigFinanceira>): Observable<ConfigFinanceira> {
    return this.http.patch<ConfigFinanceira>(`${this.base}atual/`, payload);
  }
}
