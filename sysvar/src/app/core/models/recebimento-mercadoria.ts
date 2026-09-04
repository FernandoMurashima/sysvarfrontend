import { XmlFornecedorRecebido } from './xml-fornecedor-recebido';

export type StatusRecebimentoMercadoria = 'ABERTO' | 'EM_CONFERENCIA' | 'CONCLUIDO' | 'CANCELADO';

export interface PedidoRecebimentoMercadoria {
  id: number;
  emissao: string;
  fornecedor: number;
  fornecedor_nome: string;
  loja: number;
  loja_nome: string;
  quantidade: string;
  valor: string;
  status: string;
  status_label: string;
}

export interface RecebimentoMercadoria {
  id: number;
  empresa: number;
  loja: number | null;
  loja_nome: string | null;
  xml_fornecedor: number | null;
  xml_fornecedor_dados: XmlFornecedorRecebido | null;
  fornecedor: number | null;
  fornecedor_nome: string | null;
  status: StatusRecebimentoMercadoria;
  status_label: string;
  criado_por: number | null;
  criado_em: string;
  atualizado_em: string;
  pedidos: PedidoRecebimentoMercadoria[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
