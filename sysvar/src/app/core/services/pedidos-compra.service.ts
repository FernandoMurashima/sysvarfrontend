// src/app/core/services/pedidos-compra.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PedidoCompra {
  id: number;
  tipo: '' | '1' | '2' | '4';
  loja: number;
  loja_nome?: string | null;
  destino_recebimento?: string | null;
  fornecedor: number;
  emissao: string;
  previsao_entrega?: string | null;
  forma_pagamento?: string | null;
  prazo_pagamento?: number | null;
  prazo_pagamento_descricao?: string | null;
  observacoes?: string | null;
  status: 'AB' | 'AP' | 'AT' | 'CA';
  total_itens: string;
  total_desconto: string;
  frete: string;
  outras_despesas?: string;
  total_pedido: string;
  cotacao_origem?: number | null;
  cotacao_origem_numero?: number | null;
  idnatureza?: number | null;
  natureza_label?: string | null;
}

export interface PedidoRecebimentosResumoTotais {
  quantidade_pedida_total: string;
  quantidade_recebida_total: string;
  saldo_total: string;
  situacao: 'PENDENTE' | 'PARCIAL' | 'RECEBIDO';
}

export interface PedidoRecebimentosResumoItem {
  pedido_item_id: number;
  produto_id: number | null;
  produto: string;
  referencia: string;
  cor: string;
  pack: string;
  quantidade_pedida: string;
  quantidade_recebida: string;
  saldo: string;
  situacao: 'PENDENTE' | 'PARCIAL' | 'RECEBIDO';
}

export interface PedidoRecebimentosResumoDocumento {
  origem: string;
  xml_fornecedor_id?: number | null;
  recebimento_id?: number | null;
  numero?: string | null;
  serie?: string | null;
  chave_acesso?: string | null;
  dh_emissao?: string | null;
  valor_total?: string | null;
  status_recebimento?: 'ABERTO' | 'EM_CONFERENCIA' | 'CONCLUIDO' | 'CANCELADO' | null;
  status_operacional?: 'DETECTADO' | 'AGUARDANDO_RECEBIMENTO' | 'EM_RECEBIMENTO' | 'RECEBIDO' | 'PROCESSADO' | 'IGNORADO' | null;
  tipo_tratamento?: string | null;
  quantidade_fisica?: string | null;
  estoque_efetivado: boolean;
  recebimento_cancelado?: boolean;
  nota_entrada_id?: number | null;
  status_fiscal?: 'AB' | 'FE' | 'CA' | null;
  nota_cancelada?: boolean;
}

export interface PedidoRecebimentosResumo {
  pedido_id: number;
  resumo: PedidoRecebimentosResumoTotais;
  itens: PedidoRecebimentosResumoItem[];
  documentos: PedidoRecebimentosResumoDocumento[];
}

export interface PedidoCompraImportacaoLinha {
  linha_planilha: number;
  origem: string;
  codigo_produto_fornecedor: string;
  produto_id: number;
  produto: string;
  produto_referencia: string;
  grade: string;
  cor_id: number;
  cor: string;
  pack_id: number;
  pack: string;
  n_packs: number;
  quantidade_calculada: string;
  preco_unitario: string;
  desconto: string;
  total: string;
  observacoes: string;
  situacao: string;
}

export interface PedidoCompraImportacaoPreview {
  valid: boolean;
  errors: string[];
  total_linhas_planilha: number;
  total_linhas_preview: number;
  total_quantidade: string;
  total_valor: string;
  linhas: PedidoCompraImportacaoLinha[];
}

export interface PedidoCompraImportacaoResultado {
  pedido_id: number;
  itens_criados: number;
  referencias: number;
  quantidade_total: string;
  total_importado: string;
  pedido: PedidoCompra;
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
    tipo?: '1' | '2' | '4';
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

  getRecebimentosResumo(pedidoId: number): Observable<PedidoRecebimentosResumo> {
    return this.http.get<PedidoRecebimentosResumo>(`${this.base}${pedidoId}/recebimentos-resumo/`);
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

  setFormaPagamento(id: number, codigo_forma: string, id_prazo?: number | null) {
    return this.http.post<PedidoCompra>(`${this.base}${id}/set-forma-pagamento/`, {
      codigo_forma: codigo_forma?.trim(),
      id_prazo: id_prazo || null,
    });
  }

  aprovar(id: number, idnatureza: number) {
    return this.http.post<PedidoCompra>(`${this.base}${id}/aprovar/`, { idnatureza });
  }

  alterarNatureza(id: number, idnatureza: number) {
    return this.http.post<PedidoCompra>(`${this.base}${id}/alterar-natureza/`, { idnatureza });
  }

  cancelar(id: number) {
    // ação custom do backend: POST /compras/pedidos/{id}/cancelar/
    return this.http.post<PedidoCompra>(`${this.base}${id}/cancelar/`, {});
  }

  previewImportacaoRevenda(id: number, arquivo: File): Observable<PedidoCompraImportacaoPreview> {
    const form = new FormData();
    form.append('arquivo', arquivo);
    return this.http.post<PedidoCompraImportacaoPreview>(`${this.base}${id}/importar-planilha-preview/`, form);
  }

  confirmarImportacaoRevenda(id: number, linhas: PedidoCompraImportacaoLinha[]): Observable<PedidoCompraImportacaoResultado> {
    return this.http.post<PedidoCompraImportacaoResultado>(`${this.base}${id}/importar-planilha-confirmar/`, { linhas });
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
