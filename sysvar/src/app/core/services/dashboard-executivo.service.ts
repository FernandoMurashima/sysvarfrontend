import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardCard {
  key: string;
  label: string;
  value: number;
  previous: number;
  variation: number;
  kind: 'money' | 'number' | 'percent';
  inverse: boolean;
  positive: boolean;
}

export interface DashboardExecutivo {
  periodo: { inicio: string; fim: string };
  comparacao: { inicio: string; fim: string };
  empresa: { id: number; nome: string };
  filtros: {
    empresas: Array<{ id: number; nome: string }>;
    lojas: Array<{ id: number; nome: string; tipo: string }>;
    vendedores: Array<{ id: number; nome: string }>;
  };
  indicadores: {
    cards: DashboardCard[];
    base: Record<string, number>;
    estoque: { valor: number; valor_venda: number; itens: number; estoque_baixo: number };
  };
  graficos: {
    faturamento_diario: Array<{ data: string; atual: number; anterior: number }>;
    pagamentos: Array<{ forma: string; total: number; vendas: number; percentual: number }>;
    lojas: Array<{ loja: string; total: number; vendas: number }>;
  };
  tabelas: {
    vendedores: Array<{ vendedor: string; total: number; vendas: number }>;
    produtos: Array<{ produto: string; referencia: string; qtd: number; total: number; cmv: number }>;
    evolucao: Array<{ indicador: string; atual: number; anterior: number; diferenca: number; variacao: number; kind: string }>;
    metas: Array<{ meta: string; objetivo: number; realizado: number; percentual: number }>;
  };
  alertas: Array<{ tipo: string; titulo: string; descricao: string }>;
  atualizado_em: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardExecutivoService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/dashboard/executivo/`;

  get(params: Record<string, string | number | null | undefined>): Observable<DashboardExecutivo> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<DashboardExecutivo>(this.baseUrl, { params: httpParams });
  }
}
