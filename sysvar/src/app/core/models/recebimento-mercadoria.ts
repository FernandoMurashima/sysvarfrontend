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
  conferencia_itens: RecebimentoMercadoriaConferenciaItem[];
  conferencia_resumo: RecebimentoMercadoriaConferenciaResumo;
}

export interface RecebimentoMercadoriaConferenciaItem {
  id: number;
  recebimento: number;
  pedido: number;
  pedido_item: number;
  produto: number;
  produto_referencia: string | null;
  produto_descricao: string;
  cor: number;
  cor_nome: string;
  tamanho: number;
  tamanho_nome: string;
  produto_detalhe: number;
  ean: string | null;
  quantidade_esperada: string;
  quantidade_recebida: string;
  diferenca: string;
  situacao: 'OK' | 'FALTA' | 'SOBRA';
}

export interface RecebimentoMercadoriaConferenciaResumo {
  quantidade_esperada_total: string;
  quantidade_recebida_total: string;
  diferenca_total: string;
  quantidade_pedido_total: string;
  quantidade_nfe_total: string | null;
  quantidade_fisica_total: string;
  diferenca_nfe_pedido: string | null;
  diferenca_fisico_nfe: string | null;
  diferenca_fisico_pedido: string;
  quantidade_skus: number;
  quantidade_skus_com_divergencia: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
