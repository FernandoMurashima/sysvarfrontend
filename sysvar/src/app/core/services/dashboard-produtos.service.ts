import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardCard } from './dashboard-executivo.service';

export interface DashboardProdutos {
  periodo: { inicio: string; fim: string };
  comparacao: { inicio: string; fim: string };
  empresa: { id: number; nome: string };
  filtros: {
    lojas: Array<{ id: number; nome: string; tipo: string }>;
    vendedores: Array<{ id: number; nome: string }>;
    grupos: Array<{ id: number; nome: string }>;
    subgrupos: Array<{ id: number; nome: string; grupo: number }>;
    colecoes: Array<{ id: number; nome: string; estacao: string }>;
    cores: Array<{ id: number; nome: string }>;
    tamanhos: Array<{ id: number; nome: string }>;
    estacoes: string[];
  };
  indicadores: {
    cards: DashboardCard[];
    base: Record<string, number>;
  };
  graficos: {
    categorias: GrupoProduto[];
    colecoes: GrupoProduto[];
    lojas: Array<{ loja: string; total: number; qtd: number }>;
    diario: Array<{ data: string; atual: number; anterior: number }>;
  };
  tabelas: {
    ranking: ProdutoRanking[];
    lucro: ProdutoRanking[];
    quedas: ProdutoRanking[];
    por_loja: { lojas: string[]; produtos: Array<{ produto: string; total: number; lojas: Record<string, number> }> };
    abc: ProdutoRanking[];
    cores: GrupoProduto[];
    tamanhos: GrupoProduto[];
  };
  insights: Array<{ tipo: string; titulo: string; descricao: string }>;
  atualizado_em: string;
}

export interface ProdutoRanking {
  produto: string;
  referencia: string;
  categoria: string;
  subcategoria: string;
  colecao: string;
  cor: string;
  tamanho: string;
  qtd: number;
  faturamento: number;
  cmv: number;
  lucro_bruto: number;
  margem_bruta: number;
  participacao: number;
  estoque: number;
  qtd_anterior: number;
  diferenca?: number;
  variacao?: number;
  classe?: string;
  acumulado?: number;
}

export interface GrupoProduto {
  nome: string;
  qtd: number;
  faturamento: number;
  lucro_bruto: number;
  percentual: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardProdutosService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/dashboard/produtos/`;

  get(params: Record<string, string | number | null | undefined>): Observable<DashboardProdutos> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<DashboardProdutos>(this.baseUrl, { params: httpParams });
  }
}
