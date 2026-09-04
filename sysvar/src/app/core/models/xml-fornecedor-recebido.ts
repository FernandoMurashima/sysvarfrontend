export type StatusOperacionalXmlFornecedor =
  | 'DETECTADO'
  | 'AGUARDANDO_RECEBIMENTO'
  | 'EM_RECEBIMENTO'
  | 'RECEBIDO'
  | 'PROCESSADO'
  | 'IGNORADO';

export type SituacaoFiscalXmlFornecedor =
  | 'DESCONHECIDA'
  | 'AUTORIZADA'
  | 'CANCELADA'
  | 'DENEGADA';

export interface XmlFornecedorRecebido {
  id: number;
  empresa: number;
  loja: number | null;
  loja_nome?: string | null;
  fornecedor: number | null;
  fornecedor_nome?: string | null;
  chave_acesso: string;
  modelo: string;
  serie: string;
  numero: string;
  dh_emissao?: string | null;
  emitente_documento: string;
  emitente_nome: string;
  destinatario_documento: string;
  destinatario_nome: string;
  valor_total: string;
  situacao_fiscal: SituacaoFiscalXmlFornecedor;
  status_operacional: StatusOperacionalXmlFornecedor;
  caminho_origem_local: string;
  identificador_agente: string;
  detectado_em: string;
  atualizado_em: string;
}

export interface XmlFornecedorRecebidoIndicadores {
  total: number;
  detectadas: number;
  aguardando_recebimento: number;
  em_recebimento: number;
  recebidas_processadas: number;
  pendentes: number;
}

export interface XmlFornecedorRecebidoListParams {
  loja?: number | string;
  fornecedor?: number | string;
  status_operacional?: StatusOperacionalXmlFornecedor | string;
  situacao_fiscal?: SituacaoFiscalXmlFornecedor | string;
  search?: string;
  chave_acesso?: string;
  detectado_de?: string;
  detectado_ate?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
