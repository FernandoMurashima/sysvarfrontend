import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TabelaPrecoProduto {
  Idprodutopreco: number;
  produto: number;
  tabela: number;
  preco: number;
  preco_promocional?: number | null;
  DataInicio?: string | null;
  DataFim?: string | null;
  ativo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TabelaprecoProdutoService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto/produto-preco/`;

  list(params: any = {}): Observable<TabelaPrecoProduto[]> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<any>(this.base, { params: httpParams }).pipe(
      map(res => (Array.isArray(res) ? res : (res?.results ?? res ?? [])))
    );
  }

  create(payload: Partial<TabelaPrecoProduto>): Observable<TabelaPrecoProduto> {
    return this.http.post<TabelaPrecoProduto>(this.base, payload);
  }

  update(id: number, payload: Partial<TabelaPrecoProduto>): Observable<TabelaPrecoProduto> {
    return this.http.patch<TabelaPrecoProduto>(`${this.base}${id}/`, payload);
  }

  /**
   * Upsert simples: procura registro ativo do produto+tabela; se existir, atualiza preço;
   * senão, cria novo com DataInicio=hoje.
   */
  upsert(tabelaId: number, produtoId: number, preco: number): Observable<TabelaPrecoProduto> {
    // tenta filtrar no backend; se o backend não filtrar, filtramos no client.
    return this.list({ produto: produtoId, tabela: tabelaId }).pipe(
      switchMap((rows) => {
        const arr = Array.isArray(rows) ? rows : [];
        const current = arr.find(x =>
          Number(x.produto) === Number(produtoId) &&
          Number(x.tabela) === Number(tabelaId) &&
          (x.ativo ?? true)
        );
        if (current) {
          return this.update(current.Idprodutopreco, { preco });
        }
        return this.create({
          produto: produtoId,
          tabela: tabelaId,
          preco,
          ativo: true
        });
      })
    );
  }
}
