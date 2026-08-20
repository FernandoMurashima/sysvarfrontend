export type RequisicaoPrioridade = 'NORMAL' | 'URGENTE' | 'EMERGENCIAL';
export type RequisicaoStatus = 'RASCUNHO' | 'SOLICITADA' | 'EM_ANALISE' | 'AGUARDANDO_APROVACAO' | 'APROVADA' | 'EM_ATENDIMENTO' | 'ATENDIDA_PARCIALMENTE' | 'EM_PROCESSO_COMPRA' | 'EM_PROCESSO_CONTRATACAO' | 'CONCLUIDA' | 'REJEITADA' | 'CANCELADA';
export type RequisicaoItemTipo = 'MATERIAL' | 'SERVICO';
export type RequisicaoItemOrigem = 'PRODUTO' | 'LIVRE' | 'SERVICO';
export type RequisicaoItemStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'EM_SEPARACAO' | 'ATENDIDO' | 'ATENDIDO_PARCIALMENTE' | 'AGUARDANDO_COTACAO' | 'EM_COTACAO' | 'PEDIDO_GERADO' | 'AGUARDANDO_RECEBIMENTO' | 'RECEBIDO' | 'SERVICO_CONTRATACAO' | 'SERVICO_CONCLUIDO' | 'CANCELADO';

export interface RequisicaoServicoCategoria {
  id: number;
  empresa: number;
  nome: string;
  ativo: boolean;
}

export interface RequisicaoSetor {
  id: number;
  empresa: number;
  empresa_nome?: string | null;
  nome: string;
  descricao?: string;
  ativo: boolean;
  pode_fazer_requisicao: boolean;
  recebe_requisicoes: boolean;
  controla_estoque_uso_consumo: boolean;
}

export interface RequisicaoItem {
  id: number;
  requisicao: number;
  tipo: RequisicaoItemTipo;
  origem: RequisicaoItemOrigem;
  produto: number | null;
  produto_descricao?: string | null;
  produto_referencia?: string | null;
  descricao: string;
  categoria: string;
  unidade: number | null;
  unidade_descricao?: string | null;
  especificacao_tecnica: string;
  titulo_servico: string;
  descricao_servico: string;
  categoria_servico: number | null;
  categoria_servico_nome?: string | null;
  tipo_servico: string;
  qtd_solicitada: string;
  qtd_atendida: string;
  qtd_pendente: string;
  status: RequisicaoItemStatus;
  observacoes: string;
}

export interface RequisicaoHistorico {
  id: number;
  requisicao: number;
  item: number | null;
  usuario: number | null;
  usuario_nome?: string | null;
  data_hora: string;
  acao: string;
  status_anterior: string;
  status_novo: string;
  observacao: string;
}

export interface Requisicao {
  id: number;
  numero: number;
  empresa: number;
  loja: number;
  loja_nome?: string | null;
  setor: number;
  setor_nome?: string | null;
  requisitante: number;
  requisitante_nome?: string | null;
  data_requisicao: string;
  data_necessaria: string | null;
  prioridade: RequisicaoPrioridade;
  justificativa: string;
  observacoes: string;
  status: RequisicaoStatus;
  itens?: RequisicaoItem[];
  historico?: RequisicaoHistorico[];
}

export interface Paginated<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}
