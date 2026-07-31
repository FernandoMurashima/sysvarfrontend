import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardCard } from './dashboard-executivo.service';

export interface EstoqueGrupo {
  nome: string;
  qtd: number;
  valor: number;
  itens: number;
  percentual: number;
}

export interface EstoqueProduto {
  produto: string;
  referencia: string;
  ean: string;
  categoria: string;
  subcategoria: string;
  colecao: string;
  estacao: string;
  cor: string;
  tamanho: string;
  loja: string;
  saldo: number;
  reservado: number;
  disponivel: number;
  custo: number;
  valor: number;
  giro: number;
  cobertura: number;
  ultima_venda: string | null;
  dias_sem_venda: number | null;
}

export interface DashboardEstoque {
  periodo: { inicio: string; fim: string };
  comparacao: { inicio: string; fim: string };
  empresa: { id: number; nome: string };
  filtros: {
    lojas: Array<{ id: number; nome: string; tipo: string }>;
    grupos: Array<{ id: number; nome: string }>;
    subgrupos: Array<{ id: number; nome: string; grupo: number | null }>;
    colecoes: Array<{ id: number; nome: string; estacao: string }>;
    cores: Array<{ id: number; nome: string }>;
    tamanhos: Array<{ id: number; nome: string }>;
  };
  indicadores: { cards: DashboardCard[]; base: Record<string, number> };
  graficos: {
    evolucao: Array<{ data: string; valor: number; media: number }>;
    categorias: EstoqueGrupo[];
    distribuicao: Array<{ nome: string; valor: number; percentual: number }>;
    lojas: EstoqueGrupo[];
    giro_mensal: Array<{ mes: string; giro: number }>;
  };
  tabelas: {
    abc: Array<{ classe: string; itens: number; valor: number; percentual: number }>;
    maior_cobertura: EstoqueProduto[];
    sem_venda: EstoqueProduto[];
    maior_giro: EstoqueProduto[];
    baixo_giro: EstoqueProduto[];
    rupturas: EstoqueProduto[];
    excessos: EstoqueProduto[];
    cor_tamanho: EstoqueGrupo[];
    colecao_estacao: EstoqueGrupo[];
    movimentacoes: Array<{ tipo: string; qtd: number; valor: number; movimentos: number }>;
  };
  alertas: Array<{ tipo: string; titulo: string; descricao: string }>;
  insights: Array<{ tipo: string; titulo: string; descricao: string }>;
  atualizado_em: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardEstoqueService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/dashboard/estoque/`;

  get(params: Record<string, string | number | null | undefined>): Observable<DashboardEstoque> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<DashboardEstoque>(this.baseUrl, { params: httpParams });
  }
}
