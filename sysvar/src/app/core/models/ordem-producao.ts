export type OrdemProducaoStatus = 'ABERTA' | 'APROVADA' | 'EM_PRODUCAO' | 'FINALIZADA' | 'CANCELADA';

export interface OrdemProducaoItem {
  id?: number;
  ordem: number;
  ficha_item: number;
  tipo: 'INSUMO' | 'AVIAMENTO' | 'SERVICO';
  produto?: number | null;
  produto_descricao?: string | null;
  fornecedor?: number | null;
  fornecedor_nome?: string | null;
  descricao?: string | null;
  unidade?: number | null;
  unidade_descricao?: string | null;
  unidade_permite_decimal?: boolean;
  quantidade_base: number;
  perda_percentual?: number;
  quantidade_necessaria: number;
  custo_unitario_previsto?: number;
  custo_unitario_real?: number;
  custo_total_previsto?: number;
  custo_total_real?: number;
  observacoes?: string | null;
  ordem_linha?: number;
  status_faccao?: 'PENDENTE' | 'ENVIADO' | 'RETORNADO' | string;
  documento_faccao?: string | null;
  data_envio_faccao?: string | null;
  data_retorno_faccao?: string | null;
  quantidade_enviada_faccao?: number;
  quantidade_retornada_faccao?: number;
}

export interface OrdemProducaoGrade {
  id?: number;
  ordem?: number;
  sku_final: number;
  quantidade: number;
  sku_ean?: string | null;
  sku_cor?: string | null;
  sku_tamanho?: string | null;
}

export interface OrdemProducao {
  id?: number;
  empresa?: number;
  numero?: string;
  ficha_tecnica: number;
  ficha_versao?: string | null;
  produto_final?: number;
  produto_descricao?: string | null;
  produto_referencia?: string | null;
  sku_final?: number | null;
  sku_ean?: string | null;
  sku_cor?: string | null;
  sku_tamanho?: string | null;
  quantidade: number;
  rendimento?: number;
  status?: OrdemProducaoStatus;
  custo_previsto?: number;
  custo_real?: number;
  observacoes?: string | null;
  data_emissao?: string;
  data_inicio?: string | null;
  data_finalizacao?: string | null;
  itens?: OrdemProducaoItem[];
  grade_producao?: OrdemProducaoGrade[];
}
