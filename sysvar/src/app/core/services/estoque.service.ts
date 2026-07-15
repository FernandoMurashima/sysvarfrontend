import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Estoque, EstoqueMovimentacao, InventarioEstoque, InventarioEstoqueItem } from '../models/estoque';

type ListResp<T> = T[] | { results: T[]; count: number };

@Injectable({ providedIn: 'root' })
export class EstoqueService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/produto`;

  list(params?: Record<string, string | number | null | undefined>): Observable<ListResp<Estoque>> {
    return this.http.get<ListResp<Estoque>>(`${this.base}/estoque/`, { params: this.params(params) });
  }

  listMovimentacoes(params?: Record<string, string | number | null | undefined>): Observable<ListResp<EstoqueMovimentacao>> {
    return this.http.get<ListResp<EstoqueMovimentacao>>(`${this.base}/estoque-movimentacao/`, { params: this.params(params) });
  }

  createMovimentacao(payload: Partial<EstoqueMovimentacao>): Observable<EstoqueMovimentacao> {
    return this.http.post<EstoqueMovimentacao>(`${this.base}/estoque-movimentacao/`, payload);
  }

  listInventarios(params?: Record<string, string | number | null | undefined>): Observable<ListResp<InventarioEstoque>> {
    return this.http.get<ListResp<InventarioEstoque>>(`${this.base}/inventario-estoque/`, { params: this.params(params) });
  }

  createInventario(payload: Partial<InventarioEstoque>): Observable<InventarioEstoque> {
    return this.http.post<InventarioEstoque>(`${this.base}/inventario-estoque/`, payload);
  }

  gerarItensInventario(id: number): Observable<{ created: number }> {
    return this.http.post<{ created: number }>(`${this.base}/inventario-estoque/${id}/gerar-itens/`, {});
  }

  fecharInventario(id: number): Observable<InventarioEstoque> {
    return this.http.post<InventarioEstoque>(`${this.base}/inventario-estoque/${id}/fechar/`, {});
  }

  validarInventario(id: number): Observable<any> {
    return this.http.post<any>(`${this.base}/inventario-estoque/${id}/validar/`, {});
  }

  finalizarInventario(id: number): Observable<InventarioEstoque> {
    return this.http.post<InventarioEstoque>(`${this.base}/inventario-estoque/${id}/finalizar/`, {});
  }

  updateInventarioItem(id: number, payload: Partial<InventarioEstoqueItem>): Observable<InventarioEstoqueItem> {
    return this.http.patch<InventarioEstoqueItem>(`${this.base}/inventario-estoque-item/${id}/`, payload);
  }

  private params(params?: Record<string, string | number | null | undefined>): HttpParams {
    let p = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
    });
    return p;
  }
}
