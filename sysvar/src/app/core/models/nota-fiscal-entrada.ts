export interface NotaFiscalEntrada {
  id: number;
  empresa: number;
  loja: number;
  fornecedor: number;
  pedido_compra: number | null;
  modelo: string;
  serie: string;
  numero: string;
  chave_acesso: string;
  dt_emissao: string;
  dt_entrada: string;
  status: 'AB' | 'FE' | 'CA';
  valor_produtos: string;
  valor_desconto: string;
  valor_frete: string;
  valor_total: string;
  observacoes: string;
  xml_original?: string;
  xml_importado?: boolean;
  natureza_operacao?: string;
  emitente_documento?: string;
  emitente_nome?: string;
  emitente_ie?: string;
  destinatario_documento?: string;
  destinatario_nome?: string;
  protocolo_autorizacao?: string;
  situacao_fiscal?: 'DESCONHECIDA' | 'AUTORIZADA' | 'CANCELADA' | 'DENEGADA';
  ambiente?: string;
  finalidade_nfe?: string;
  dh_emissao?: string | null;
  protocolo_cstat?: string;
  protocolo_motivo?: string;
  resumo_conciliacao?: NotaFiscalEntradaResumoConciliacao | null;
  resumo_conferencia?: NotaFiscalEntradaResumoConferencia | null;
  cancelado_por?: number | null;
  cancelado_em?: string | null;
  motivo_cancelamento?: string;
  destino_recebimento?: string | null;
  loja_estoque_id?: number | null;
  criado_por?: number | null;
  criado_em?: string;
  atualizado_em?: string;
  itens?: NotaFiscalEntradaItem[];
}

export interface NotaFiscalEntradaResumoConciliacao {
  total_itens: number;
  itens_conciliados: number;
  itens_pendentes: number;
  nota_conciliada: boolean;
}

export interface NotaFiscalEntradaResumoConferencia {
  total_itens: number;
  itens_conferidos: number;
  itens_nao_conferidos: number;
  itens_com_divergencia: number;
  quantidade_faltante_total: string;
  valor_divergente_total: string;
  possui_divergencia_pendente: boolean;
  conversoes_pendentes: number;
  conferencia_completa: boolean;
}

export interface NotaFiscalEntradaItemXml {
  id: number;
  nota: number;
  numero_item: number;
  codigo_produto_fornecedor: string;
  descricao_produto: string;
  gtin_ean: string;
  ncm: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: string;
  quantidade_recebida: string | null;
  valor_unitario_comercial: string;
  valor_produto: string;
  valor_desconto: string;
  informacoes_adicionais: string;
  produto: number | null;
  produto_descricao?: string | null;
  produto_referencia?: string | null;
  produto_fornecedor: number | null;
  produto_fornecedor_codigo?: string | null;
  pedido_item: number | null;
  origem_conciliacao: string;
  unidade_fornecedor_efetivada?: string;
  fator_conversao_efetivado?: string | null;
  quantidade_interna_efetivada?: string | null;
  efetivado_em?: string | null;
  conciliado: boolean;
  conferido: boolean;
  quantidade_faltante?: string | null;
  valor_divergente?: string | null;
  quantidade_interna_recebida?: string | null;
  conversao?: {
    unidade_fornecedor?: string;
    unidade_interna?: string;
    fator_conversao?: string;
    quantidade_interna?: string | null;
    conversao_pendente?: boolean;
  };
}

export interface NotaFiscalEntradaCobrancaParcela {
  numero: string;
  vencimento: string;
  valor: string;
}

export interface NotaFiscalEntradaPagamentoFiscal {
  codigo_tpag: string;
  descricao_tpag: string;
  valor: string;
}

export interface NotaFiscalEntradaFormaPagamentoSugestao {
  id: number;
  codigo: string;
  descricao: string;
  tipo: string;
}

export interface NotaFiscalEntradaCobrancaFinanceira {
  usa_duplicatas: boolean;
  valor_fatura: string;
  parcelas: NotaFiscalEntradaCobrancaParcela[];
  pagamentos: NotaFiscalEntradaPagamentoFiscal[];
  forma_pagamento_conciliada: boolean;
  forma_pagamento_sysvar_id: number | null;
  forma_pagamento_sysvar_codigo: string | null;
  forma_pagamento_sysvar_descricao: string | null;
  forma_pagamento_sysvar_tipo: string | null;
  sugestoes: NotaFiscalEntradaFormaPagamentoSugestao[];
  pendencias: string[];
  financeiro_pronto: boolean;
}

export interface NotaFiscalEntradaProdutoCandidato {
  id: number;
  referencia: string;
  descricao: string;
  unidade_interna: string;
}

export interface NotaFiscalEntradaDivergenciaXml {
  id: number;
  nota: number;
  item_xml: number;
  fornecedor: number;
  produto: number;
  quantidade_fiscal: string;
  quantidade_recebida: string;
  quantidade_faltante: string;
  valor_divergente: string;
  status: 'PENDENTE' | 'RESOLVIDA' | 'CANCELADA';
  resolvido_em?: string | null;
}

export interface NotaFiscalEntradaAnaliseCancelamento {
  pode_cancelar: boolean;
  bloqueios: string[];
  avisos: Array<{
    tipo: string;
    produto?: number | null;
    codigo?: string | null;
    saldo_atual?: string;
    quantidade_estorno?: string;
    saldo_previsto?: string;
  }>;
  pedido: number | null;
  valor_financeiro: string;
}

export interface NotaFiscalEntradaEventoFiscal {
  id: number;
  nota: number;
  chave_acesso: string;
  tipo_evento: string;
  tipo_evento_descricao: string;
  sequencia: number;
  data_hora_evento?: string | null;
  protocolo: string;
  cstat: string;
  xmotivo: string;
  ambiente: string;
  situacao_processamento: string;
  criado_em?: string;
}

export interface NotaFiscalEntradaItem {
  id: number;
  nota: number;
  pedido_item: number;
  qtd_recebida: string;
  preco_unit_nf: string;
  desconto_item: string;
  total_item: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface NotaFiscalEntradaPedidoItem {
  pedido_item: number;
  nota_item: number | null;
  produto: number | null;
  produto_descricao?: string | null;
  produto_referencia?: string | null;
  cor: number | null;
  cor_nome?: string | null;
  pack: number | null;
  pack_nome?: string | null;
  descricao_livre: string | null;
  qtd_pedido: string;
  qtd_recebida_outras_notas: string;
  qtd_na_nota: string;
  saldo_total_recebivel: string;
  saldo_pendente: string;
  preco_unit_pedido: string;
  qtd_pack?: string | null;
  n_packs?: number | null;
  quantidades_validas?: string[];
}
