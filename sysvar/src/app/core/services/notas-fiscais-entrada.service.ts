import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  NotaFiscalEntrada,
  NotaFiscalEntradaAnaliseCancelamento,
  NotaFiscalEntradaDivergenciaXml,
  NotaFiscalEntradaItem,
  NotaFiscalEntradaItemXml,
  NotaFiscalEntradaPedidoItem,
  NotaFiscalEntradaProdutoCandidato,
  NotaFiscalEntradaResumoConferencia,
  NotaFiscalEntradaResumoConciliacao,
} from '../models/nota-fiscal-entrada';

type Paginated<T> = {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
};

export type NotaFiscalEntradaIndicadores = {
  total: number;
  abertas: number;
  fechadas: number;
  canceladas: number;
  valor_total: string;
};

export type NotaFiscalEntradaListParams = {
  pedido?: number;
  pedido_compra?: number;
  fornecedor?: number;
  loja?: number;
  status?: string;
  numero?: string;
  chave_acesso?: string;
  search?: string;
  dt_emissao_de?: string;
  dt_emissao_ate?: string;
  dt_entrada_de?: string;
  dt_entrada_ate?: string;
  valor_min?: number | string;
  valor_max?: number | string;
  page?: number;
  page_size?: number;
};

@Injectable({ providedIn: 'root' })
export class NotasFiscaisEntradaService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/fiscal/notas-entrada/`;
  private baseItens = `${environment.apiBaseUrl}/fiscal/notas-entrada-itens/`;

  listar(params?: NotaFiscalEntradaListParams): Observable<NotaFiscalEntrada[] | Paginated<NotaFiscalEntrada>> {
    let hp = new HttpParams();
    if (params?.pedido) hp = hp.set('pedido', String(params.pedido));
    if (params?.pedido_compra) hp = hp.set('pedido_compra', String(params.pedido_compra));
    if (params?.fornecedor) hp = hp.set('fornecedor', String(params.fornecedor));
    if (params?.loja) hp = hp.set('loja', String(params.loja));
    if (params?.status) hp = hp.set('status', params.status);
    if (params?.numero) hp = hp.set('numero', params.numero);
    if (params?.chave_acesso) hp = hp.set('chave_acesso', params.chave_acesso);
    if (params?.search) hp = hp.set('search', params.search);
    if (params?.dt_emissao_de) hp = hp.set('dt_emissao_de', params.dt_emissao_de);
    if (params?.dt_emissao_ate) hp = hp.set('dt_emissao_ate', params.dt_emissao_ate);
    if (params?.dt_entrada_de) hp = hp.set('dt_entrada_de', params.dt_entrada_de);
    if (params?.dt_entrada_ate) hp = hp.set('dt_entrada_ate', params.dt_entrada_ate);
    if (params?.valor_min !== undefined && params.valor_min !== null && params.valor_min !== '') hp = hp.set('valor_min', String(params.valor_min));
    if (params?.valor_max !== undefined && params.valor_max !== null && params.valor_max !== '') hp = hp.set('valor_max', String(params.valor_max));
    if (params?.page) hp = hp.set('page', String(params.page));
    if (params?.page_size) hp = hp.set('page_size', String(params.page_size));
    return this.http.get<NotaFiscalEntrada[] | Paginated<NotaFiscalEntrada>>(this.base, { params: hp });
  }

  indicadores(params?: NotaFiscalEntradaListParams): Observable<NotaFiscalEntradaIndicadores> {
    let hp = new HttpParams();
    if (params?.pedido) hp = hp.set('pedido', String(params.pedido));
    if (params?.pedido_compra) hp = hp.set('pedido_compra', String(params.pedido_compra));
    if (params?.fornecedor) hp = hp.set('fornecedor', String(params.fornecedor));
    if (params?.loja) hp = hp.set('loja', String(params.loja));
    if (params?.status) hp = hp.set('status', params.status);
    if (params?.numero) hp = hp.set('numero', params.numero);
    if (params?.chave_acesso) hp = hp.set('chave_acesso', params.chave_acesso);
    if (params?.search) hp = hp.set('search', params.search);
    if (params?.dt_emissao_de) hp = hp.set('dt_emissao_de', params.dt_emissao_de);
    if (params?.dt_emissao_ate) hp = hp.set('dt_emissao_ate', params.dt_emissao_ate);
    if (params?.dt_entrada_de) hp = hp.set('dt_entrada_de', params.dt_entrada_de);
    if (params?.dt_entrada_ate) hp = hp.set('dt_entrada_ate', params.dt_entrada_ate);
    if (params?.valor_min !== undefined && params.valor_min !== null && params.valor_min !== '') hp = hp.set('valor_min', String(params.valor_min));
    if (params?.valor_max !== undefined && params.valor_max !== null && params.valor_max !== '') hp = hp.set('valor_max', String(params.valor_max));
    return this.http.get<NotaFiscalEntradaIndicadores>(`${this.base}indicadores/`, { params: hp });
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

  importarXml(arquivo: File, pedidoCompra?: number | null): Observable<NotaFiscalEntrada> {
    const form = new FormData();
    form.append('arquivo', arquivo);
    if (pedidoCompra) form.append('pedido_compra', String(pedidoCompra));
    return this.http.post<NotaFiscalEntrada>(`${this.base}importar-xml/`, form);
  }

  listarItensXml(id: number): Observable<NotaFiscalEntradaItemXml[]> {
    return this.http.get<NotaFiscalEntradaItemXml[]>(`${this.base}${id}/itens-xml/`);
  }

  pendenciasXml(id: number): Observable<NotaFiscalEntradaItemXml[]> {
    return this.http.get<NotaFiscalEntradaItemXml[]>(`${this.base}${id}/pendencias-xml/`);
  }

  conciliarAutomaticamente(id: number): Observable<{ resultado: unknown; resumo: NotaFiscalEntradaResumoConciliacao }> {
    return this.http.post<{ resultado: unknown; resumo: NotaFiscalEntradaResumoConciliacao }>(`${this.base}${id}/conciliar-automaticamente/`, {});
  }

  resumoConciliacao(id: number): Observable<NotaFiscalEntradaResumoConciliacao> {
    return this.http.get<NotaFiscalEntradaResumoConciliacao>(`${this.base}${id}/resumo-conciliacao/`);
  }

  candidatosItemXml(id: number, item: number, termo = ''): Observable<NotaFiscalEntradaProdutoCandidato[]> {
    let params = new HttpParams().set('item', String(item));
    if (termo) params = params.set('q', termo);
    return this.http.get<NotaFiscalEntradaProdutoCandidato[]>(`${this.base}${id}/item-xml-candidatos/`, { params });
  }

  conciliarItemXml(id: number, item: number, produto: number): Observable<NotaFiscalEntradaItemXml> {
    return this.http.post<NotaFiscalEntradaItemXml>(`${this.base}${id}/item-xml-conciliar/`, { item, produto });
  }

  conferirItemXml(id: number, item: number, quantidadeRecebida: number | string): Observable<{ item: NotaFiscalEntradaItemXml; divergencia: NotaFiscalEntradaDivergenciaXml | null; resumo: NotaFiscalEntradaResumoConferencia }> {
    return this.http.post<{ item: NotaFiscalEntradaItemXml; divergencia: NotaFiscalEntradaDivergenciaXml | null; resumo: NotaFiscalEntradaResumoConferencia }>(
      `${this.base}${id}/item-xml-conferir/`,
      { item, quantidade_recebida: String(quantidadeRecebida) },
    );
  }

  conferirItensXml(id: number, itens: Array<{ item: number; quantidade_recebida: number | string }>): Observable<{ itens: NotaFiscalEntradaItemXml[]; resumo: NotaFiscalEntradaResumoConferencia }> {
    return this.http.post<{ itens: NotaFiscalEntradaItemXml[]; resumo: NotaFiscalEntradaResumoConferencia }>(`${this.base}${id}/conferir-itens-xml/`, { itens });
  }

  resumoConferencia(id: number): Observable<NotaFiscalEntradaResumoConferencia> {
    return this.http.get<NotaFiscalEntradaResumoConferencia>(`${this.base}${id}/resumo-conferencia/`);
  }

  divergenciasXml(id: number): Observable<NotaFiscalEntradaDivergenciaXml[]> {
    return this.http.get<NotaFiscalEntradaDivergenciaXml[]>(`${this.base}${id}/divergencias-xml/`);
  }

  resolverDivergenciaXml(id: number, divergencia: number): Observable<NotaFiscalEntradaDivergenciaXml> {
    return this.http.post<NotaFiscalEntradaDivergenciaXml>(`${this.base}${id}/resolver-divergencia-xml/`, { divergencia });
  }

  analisarCancelamento(id: number): Observable<NotaFiscalEntradaAnaliseCancelamento> {
    return this.http.get<NotaFiscalEntradaAnaliseCancelamento>(`${this.base}${id}/analisar-cancelamento/`);
  }

  fechar(id: number): Observable<NotaFiscalEntrada & { financeiro?: unknown; estoque?: unknown; recebimento_pedido?: unknown }> {
    return this.http.post<NotaFiscalEntrada & { financeiro?: unknown; estoque?: unknown; recebimento_pedido?: unknown }>(`${this.base}${id}/fechar/`, {});
  }

  cancelar(id: number, motivo = '', confirmarAvisos = false): Observable<NotaFiscalEntrada> {
    return this.http.post<NotaFiscalEntrada>(`${this.base}${id}/cancelar/`, {
      motivo,
      confirmar_avisos: confirmarAvisos,
    });
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
