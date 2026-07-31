import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardCard } from './dashboard-executivo.service';
import { GrupoProduto, ProdutoRanking } from './dashboard-produtos.service';

export interface DashboardVendas {
  periodo: { inicio: string; fim: string };
  comparacao: { inicio: string; fim: string };
  empresa: { id: number; nome: string };
  filtros: {
    lojas: Array<{ id: number; nome: string; tipo: string }>;
    vendedores: Array<{ id: number; nome: string }>;
    clientes: Array<{ id: number; nome: string }>;
    grupos: Array<{ id: number; nome: string }>;
    colecoes: Array<{ id: number; nome: string; estacao: string }>;
    formas: Array<{ id: string; nome: string }>;
    status: Array<{ id: string; nome: string }>;
    canais: Array<{ id: string; nome: string }>;
  };
  indicadores: { cards: DashboardCard[]; base: Record<string, number> };
  graficos: {
    diario: Array<{ data: string; atual: number; anterior: number }>;
    categorias: GrupoProduto[];
    pagamentos: Array<{ forma: string; total: number; vendas: number; percentual: number }>;
    lojas: Array<{ loja: string; total: number; vendas: number }>;
    horas: { horas: number[]; linhas: Array<{ dia: string; valores: Array<{ hora: number; valor: number; intensidade: number }> }> };
    canais: Array<{ canal: string; faturamento: number; vendas: number; percentual: number; evolucao: number }>;
    semana: Array<{ dia: string; total: number; vendas: number }>;
  };
  tabelas: {
    produtos: ProdutoRanking[];
    vendedores: Array<{ vendedor: string; total: number; vendas: number }>;
    cancelamentos_devolucoes: {
      cancelamentos: { quantidade: number; valor: number; percentual: number };
      devolucoes: { quantidade: number; itens: number; valor: number; percentual: number };
    };
  };
  alertas: Array<{ tipo: string; titulo: string; descricao: string }>;
  atualizado_em: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardVendasService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/dashboard/vendas/`;

  get(params: Record<string, string | number | null | undefined>): Observable<DashboardVendas> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<DashboardVendas>(this.baseUrl, { params: httpParams });
  }
}
