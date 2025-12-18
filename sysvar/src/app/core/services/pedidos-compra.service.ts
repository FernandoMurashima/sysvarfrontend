// src/app/core/services/pedidos-compra.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PedidoCompra {
  id: number;
  tipo: '1' | '2';
  loja: number;
  fornecedor: number;
  emissao: string;
  previsao_entrega?: string | null;
  forma_pagamento?: string | null;
  observacoes?: string | null;
  status: 'AB' | 'AP' | 'CA';
  total_itens: string;
  total_desconto: string;
  frete: string;
  total_pedido: string;
}

type Paginated<T> = {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
};

@Injectable({ providedIn: 'root' })
export class PedidosCompraService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/compras/pedidos/`;
  private baseItem = `${environment.apiBaseUrl}/compras/itens/`;
  private baseParcela = `${environment.apiBaseUrl}/compras/parcelas/`;

  // ===== Pedido (header) =====

  listar(params?: {
    tipo?: '1' | '2';
    status?: string;
    loja?: number;
    fornecedor?: number;
    page?: number;
    page_size?: number;
  }): Observable<PedidoCompra[] | Paginated<PedidoCompra>> {
    let hp = new HttpParams();
    if (params?.tipo)       hp = hp.set('tipo', params.tipo);
    if (params?.status)     hp = hp.set('status', params.status);
    if (params?.loja)       hp = hp.set('loja', String(params.loja));
    if (params?.fornecedor) hp = hp.set('fornecedor', String(params.fornecedor));
    if (params?.page)       hp = hp.set('page', String(params.page));
    if (params?.page_size)  hp = hp.set('page_size', String(params.page_size));
    return this.http.get<PedidoCompra[] | Paginated<PedidoCompra>>(this.base, { params: hp });
  }

  getById(id: number): Observable<PedidoCompra> {
    return this.http.get<PedidoCompra>(`${this.base}${id}/`);
  }

  createHeader(payload: Partial<PedidoCompra>): Observable<PedidoCompra> {
    // backend ignora forma_pagamento (read_only)
    return this.http.post<PedidoCompra>(this.base, payload);
  }

  updateHeader(id: number, payload: Partial<PedidoCompra>): Observable<PedidoCompra> {
    return this.http.patch<PedidoCompra>(`${this.base}${id}/`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.base}${id}/`);
  }

  setFormaPagamento(id: number, codigo_forma: string) {
    return this.http.post<PedidoCompra>(`${this.base}${id}/set-forma-pagamento/`, {
      codigo_forma: codigo_forma?.trim(),
    });
  }

  aprovar(id: number, idnatureza: number) {
    return this.http.post<PedidoCompra>(`${this.base}${id}/aprovar/`, { idnatureza });
  }

  cancelar(id: number) {
    // ação custom do backend: POST /compras/pedidos/{id}/cancelar/
    return this.http.post<PedidoCompra>(`${this.base}${id}/cancelar/`, {});
  }

  // ===== Itens =====

  createItem(payload: any) {
    return this.http.post(this.baseItem, payload);
  }

  updateItem(id: number, payload: any) {
    return this.http.patch(`${this.baseItem}${id}/`, payload);
  }

  deleteItem(id: number) {
    return this.http.delete(`${this.baseItem}${id}/`);
  }

  listItensByPedido(pedidoId: number) {
    const params = new HttpParams().set('pedido', String(pedidoId));
    return this.http.get(this.baseItem, { params });
  }

  // ===== Parcelas (planejamento) – para uso futuro =====

  listParcelas(pedidoId: number, status?: string) {
    let params = new HttpParams().set('pedido', String(pedidoId));
    if (status) params = params.set('status', status);
    return this.http.get(this.baseParcela, { params });
  }
}
