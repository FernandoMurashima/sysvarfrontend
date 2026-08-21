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
  loja_nome?: string;
  responsavel_nome?: string;
}

export interface Paginated<T> {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}
