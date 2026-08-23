export type CotacaoStatus =
  | 'EM_ELABORACAO'
  | 'ABERTA'
  | 'PROPOSTAS_RECEBIDAS'
  | 'EM_ANALISE'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADA'
  | 'REJEITADA'
  | 'CANCELADA'
  | 'PEDIDO_GERADO'
  | 'ENCERRADA';

export type CotacaoPrioridade = 'NORMAL' | 'URGENTE' | 'EMERGENCIAL';
export type CotacaoTipoCompra = 'REVENDA' | 'USO_CONSUMO' | 'INSUMO' | 'SERVICO' | 'OUTRO';
export type CotacaoFornecedorStatus = 'CONVIDADO' | 'PROPOSTA_RECEBIDA' | 'NAO_RESPONDEU' | 'RECUSOU' | 'DESCLASSIFICADO';

export interface Cotacao {
  id: number;
  numero: number;
  empresa: number;
  loja: number;
  responsavel: number;
  data_abertura: string;
  data_limite_propostas?: string | null;
  prioridade: CotacaoPrioridade;
  tipo_compra: CotacaoTipoCompra;
  observacao?: string;
  status: CotacaoStatus;
  proposta_vencedora?: number | null;
  justificativa_vencedor?: string;
  aprovado_por?: number | null;
  aprovado_em?: string | null;
  rejeitado_por?: number | null;
  rejeitado_em?: string | null;
  motivo_rejeicao?: string;
  cancelado_por?: number | null;
  cancelado_em?: string | null;
  motivo_cancelamento?: string;
  snapshot_proposta_aprovada?: any;
  pedido_compra_gerado_id?: number | null;
  status_operacional?: string;
  loja_nome?: string;
  responsavel_nome?: string;
  requisicoes_vinculadas?: CotacaoRequisicao[];
}

export interface CotacaoItem {
  id: number;
  cotacao: number;
  origem: 'AVULSO' | 'REQUISICAO';
  produto?: number | null;
  produto_descricao?: string | null;
  descricao: string;
  quantidade_cotar: string | number;
  unidade: number;
  unidade_descricao?: string | null;
  especificacao_tecnica?: string;
  marca_desejada?: string;
  modelo_referencia?: string;
  permite_alternativo: boolean;
  observacao?: string;
  requisicao_item_origem?: number | null;
  requisicao_origem_numero?: number | null;
}

export interface CotacaoRequisicao {
  id: number;
  cotacao: number;
  requisicao: number;
  requisicao_numero?: number;
}

export interface CotacaoRequisicaoDisponivel {
  id: number;
  numero: number;
  loja: number;
  loja_nome: string;
  setor_nome: string;
  requisitante_nome: string;
  quantidade_itens: number;
  data_requisicao: string;
  prioridade: string;
  itens: any[];
}

export interface CotacaoNecessidade {
  key: string;
  produto?: number | null;
  nome: string;
  quantidade_total_solicitada: string | number;
  quantidade_pendente: string | number;
  numero_requisicoes: number;
  requisicoes_ids: number[];
  lojas: string[];
  setores: string[];
  origens: Array<{
    requisicao: number;
    numero: number;
    loja_nome: string;
    setor_nome: string;
    quantidade_solicitada: string | number;
    quantidade_pendente: string | number;
  }>;
}

export interface CotacaoItemApoioDecisao {
  cotacao_item: number;
  produto?: number | null;
  necessidade_aberta?: string | number | null;
  estoque_atual?: string | number | null;
  pedidos_pendentes?: string | number | null;
  ultimas_compras: Array<{ data: string; quantidade: string | number; preco_unitario: string | number; fornecedor: string }>;
  media_quantidades_ultimas_compras?: string | number | null;
  ultimo_preco?: string | number | null;
  preco_medio?: string | number | null;
  quantidade_cotar: string | number;
}

export interface CotacaoFornecedor {
  id: number;
  cotacao: number;
  fornecedor: number;
  fornecedor_nome?: string;
  status_participacao: CotacaoFornecedorStatus;
  motivo_desclassificacao?: string;
  observacao?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface CotacaoPropostaItem {
  id?: number;
  proposta?: number;
  cotacao_item: number;
  cotacao_item_descricao?: string;
  quantidade_cotar?: string | number;
  quantidade_ofertada?: string | number | null;
  preco_unitario?: string | number | null;
  desconto_item?: string | number | null;
  marca?: string;
  modelo_referencia?: string;
  garantia?: string;
  prazo_entrega_item?: string;
  observacao?: string;
  total_item?: string | number;
}

export interface CotacaoProposta {
  id: number;
  cotacao: number;
  cotacao_fornecedor: number;
  fornecedor_nome?: string;
  data_proposta: string;
  validade_proposta?: string | null;
  prazo_entrega?: string;
  prazo_entrega_dias?: number | null;
  condicao_pagamento?: string;
  prazo_pagamento?: number | null;
  prazo_pagamento_descricao?: string;
  condicao_pagamento_legivel?: string;
  frete?: string | number;
  outras_despesas?: string | number;
  desconto_geral?: string | number;
  total_itens?: string | number;
  total_proposta?: string | number;
  observacao?: string;
  anexo?: string | null;
  ativa?: boolean;
  itens?: CotacaoPropostaItem[];
}

export interface CotacaoComparativoItem {
  cotacao_item: number;
  descricao: string;
  quantidade_cotar: string | number;
  sem_oferta: boolean;
  quantidade_ofertada?: string | number | null;
  preco_unitario?: string | number | null;
  desconto_item?: string | number | null;
  custo_final_item?: string | number | null;
  menor_preco_unitario?: boolean;
  menor_custo_final?: boolean;
  marca?: string;
  modelo_referencia?: string;
  garantia?: string;
  prazo_entrega_item?: string;
}

export interface CotacaoComparativoProposta {
  proposta: number;
  cotacao_fornecedor: number;
  fornecedor: number;
  fornecedor_nome: string;
  total_itens: string | number;
  desconto_geral: string | number;
  frete: string | number;
  outras_despesas: string | number;
  total_geral: string | number;
  menor_total_geral: boolean;
  diferenca_percentual: string | number;
  economia_vs_mais_cara: string | number;
  prazo_entrega?: string;
  prazo_entrega_dias?: number | null;
  melhor_prazo?: boolean;
  condicao_pagamento?: string;
  prazo_pagamento?: number | null;
  condicao_pagamento_legivel?: string;
  validade_proposta?: string | null;
  itens: CotacaoComparativoItem[];
}

export interface CotacaoComparativo {
  cotacao: number;
  itens: Array<{ id: number; descricao: string; quantidade_cotar: string | number }>;
  propostas: CotacaoComparativoProposta[];
}

export interface Paginated<T> {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export interface PrazoPagamento {
  Idprazo: number;
  codigo: string;
  descricao: string;
  num_parcelas: number;
  intervalo_dias: number;
  ativo: boolean;
  parcelas?: Array<{ ordem: number; dias: number; percentual?: string | number | null }>;
}
