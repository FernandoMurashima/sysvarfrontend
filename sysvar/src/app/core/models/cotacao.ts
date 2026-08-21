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

export interface Paginated<T> {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}
