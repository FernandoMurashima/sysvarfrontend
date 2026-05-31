import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  NotaFiscalEntrada,
  NotaFiscalEntradaItem,
  NotaFiscalEntradaPedidoItem,
} from '../models/nota-fiscal-entrada';

type Paginated<T> = {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
};

@Injectable({ providedIn: 'root' })
export class NotasFiscaisEntradaService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/fiscal/notas-entrada/`;
  private baseItens = `${environment.apiBaseUrl}/fiscal/notas-entrada-itens/`;

  listar(params?: {
    pedido?: number;
    pedido_compra?: number;
    status?: string;
    numero?: string;
    chave_acesso?: string;
    page?: number;
    page_size?: number;
  }): Observable<NotaFiscalEntrada[] | Paginated<NotaFiscalEntrada>> {
    let hp = new HttpParams();
    if (params?.pedido) hp = hp.set('pedido', String(params.pedido));
    if (params?.pedido_compra) hp = hp.set('pedido_compra', String(params.pedido_compra));
    if (params?.status) hp = hp.set('status', params.status);
    if (params?.numero) hp = hp.set('numero', params.numero);
    if (params?.chave_acesso) hp = hp.set('chave_acesso', params.chave_acesso);
    if (params?.page) hp = hp.set('page', String(params.page));
    if (params?.page_size) hp = hp.set('page_size', String(params.page_size));
    return this.http.get<NotaFiscalEntrada[] | Paginated<NotaFiscalEntrada>>(this.base, { params: hp });
  }

  get(id: number): Observable<NotaFiscalEntrada> {
    return this.http.get<NotaFiscalEntrada>(`${this.base}${id}/`);
  }

  criar(payload: Partial<NotaFiscalEntrada>): Observable<NotaFiscalEntrada> {
    return this.http.post<NotaFiscalEntrada>(this.base, payload);
  }

  atualizar(id: number, payload: Partial<NotaFiscalEntrada>): Observable<NotaFiscalEntrada> {
    return this.http.patch<NotaFiscalEntrada>(`${this.base}${id}/`, payload);
  }

  fechar(id: number): Observable<NotaFiscalEntrada & { financeiro?: any }> {
    return this.http.post<NotaFiscalEntrada & { financeiro?: any }>(`${this.base}${id}/fechar/`, {});
  }

  cancelar(id: number): Observable<NotaFiscalEntrada> {
    return this.http.post<NotaFiscalEntrada>(`${this.base}${id}/cancelar/`, {});
  }

  itensPedido(id: number): Observable<NotaFiscalEntradaPedidoItem[]> {
    return this.http.get<NotaFiscalEntradaPedidoItem[]>(`${this.base}${id}/itens-pedido/`);
  }

  criarItem(payload: Partial<NotaFiscalEntradaItem>): Observable<NotaFiscalEntradaItem> {
    return this.http.post<NotaFiscalEntradaItem>(this.baseItens, payload);
  }

  atualizarItem(id: number, payload: Partial<NotaFiscalEntradaItem>): Observable<NotaFiscalEntradaItem> {
    return this.http.patch<NotaFiscalEntradaItem>(`${this.baseItens}${id}/`, payload);
  }

  removerItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseItens}${id}/`);
  }
}
