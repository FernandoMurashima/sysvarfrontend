import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardCard } from './dashboard-executivo.service';

export interface DashboardFinanceiro {
  periodo: { inicio: string; fim: string };
  comparacao: { inicio: string; fim: string };
  empresa: { id: number; nome: string };
  filtros: {
    lojas: Array<{ id: number; nome: string; tipo: string }>;
    contas: Array<{ id: string; nome: string; tipo: string }>;
    naturezas: Array<{ id: number; codigo: string; descricao: string }>;
    status: string[];
  };
  indicadores: {
    cards: DashboardCard[];
    base: Record<string, number>;
  };
  graficos: {
    fluxo_caixa: Array<{ data: string; entradas: number; saidas: number; saldo: number }>;
    saldo_contas: Array<{ nome: string; tipo: string; valor: number; percentual: number }>;
    recebiveis: Array<{ faixa: string; quantidade: number; valor: number; percentual: number }>;
    evolucao_saldo: Array<{ mes: string; saldo: number; media: number }>;
  };
  tabelas: {
    pagar_resumo: Array<{ faixa: string; quantidade: number; valor: number; percentual: number }>;
    receber_resumo: Array<{ faixa: string; quantidade: number; valor: number; percentual: number }>;
    maiores_pagamentos: Array<{ fornecedor: string; natureza: string; data: string; valor: number; status: string }>;
    maiores_recebimentos: Array<{ cliente: string; data: string; valor: number; forma: string; status: string }>;
    indicadores: Array<{ indicador: string; valor: number; variacao: number }>;
  };
  alertas: Array<{ tipo: string; titulo: string; descricao: string }>;
  atualizado_em: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardFinanceiroService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/dashboard/financeiro/`;

  get(params: Record<string, string | number | null | undefined>): Observable<DashboardFinanceiro> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<DashboardFinanceiro>(this.baseUrl, { params: httpParams });
  }
}
