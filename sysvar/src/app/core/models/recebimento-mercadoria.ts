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
  termo_encerramento?: RecebimentoMercadoriaTermo | null;
  pode_encerrar_conferencia?: boolean;
  estoque_efetivado?: boolean;
  efetivacao_estoque?: RecebimentoMercadoriaEfetivacaoEstoque | null;
  pode_efetivar_estoque?: boolean;
  efetivacao_estoque_resumo?: RecebimentoMercadoriaEfetivacaoEstoqueResumo;
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

export interface RecebimentoMercadoriaTermo {
  id: number;
  encerrado_em: string;
  encerrado_por_nome: string;
  observacao_divergencia: string;
  possui_divergencia: boolean;
  hash_sha256: string;
  snapshot: RecebimentoMercadoriaTermoSnapshot;
  criado_em: string;
}

export interface RecebimentoMercadoriaTermoSnapshot {
  recebimento?: Record<string, any>;
  xml_nfe?: Record<string, any>;
  estabelecimento?: Record<string, any>;
  pedidos_vinculados?: Array<Record<string, any>>;
  totais?: Record<string, any>;
  contagem_operacional?: Record<string, any>;
  conferencia_sku?: Array<Record<string, any>>;
  divergencias?: { faltas?: Array<Record<string, any>>; sobras?: Array<Record<string, any>> };
  usuario?: Record<string, any>;
  observacao?: string;
}

export interface RecebimentoMercadoriaEfetivacaoEstoque {
  id: number;
  recebimento: number;
  termo: number;
  empresa: number;
  loja: number;
  loja_nome: string;
  efetivado_por: number;
  efetivado_por_nome: string;
  efetivado_em: string;
  quantidade_total: string;
  quantidade_skus: number;
  hash_termo: string;
  criado_em: string;
}

export interface RecebimentoMercadoriaEfetivacaoEstoqueResumo {
  loja: number | null;
  loja_nome: string | null;
  quantidade_total: string;
  quantidade_skus: number;
  hash_termo: string;
  motivo_bloqueio: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
