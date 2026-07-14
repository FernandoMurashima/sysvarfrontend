export type FichaTecnicaStatus = 'RASCUNHO' | 'APROVADA' | 'INATIVA';
export type FichaTecnicaItemTipo = 'INSUMO' | 'AVIAMENTO' | 'SERVICO';

export interface FichaTecnicaItem {
  id?: number;
  ficha: number;
  tipo: FichaTecnicaItemTipo;
  produto?: number | null;
  produto_descricao?: string | null;
  fornecedor?: number | null;
  fornecedor_nome?: string | null;
  descricao?: string | null;
  unidade?: number | null;
  unidade_descricao?: string | null;
  unidade_permite_decimal?: boolean;
  quantidade: number;
  perda_percentual?: number;
  custo_unitario_previsto?: number;
  custo_medio_produto?: number;
  custo_unitario_usado?: number;
  custo_total_previsto?: number;
  quantidade_com_perda?: number;
  observacoes?: string | null;
  ordem?: number;
}

export interface FichaTecnica {
  id?: number;
  empresa?: number;
  produto_final: number;
  produto_descricao?: string | null;
  produto_referencia?: string | null;
  versao: string;
  descricao?: string | null;
  rendimento?: number;
  status?: FichaTecnicaStatus;
  ativa?: boolean;
  observacoes?: string | null;
  custo_previsto?: number;
  itens?: FichaTecnicaItem[];
  data_cadastro?: string;
  atualizado_em?: string;
}
