export interface Estoque {
  Idestoque?: number;
  CodigodeBarra: string;
  referencia: string;
  Idloja: number;
  Estoque: number | null;
  reserva: number | null;
}

export interface ProdutoUsoConsumoEstoque {
  id: number;
  empresa: number;
  produto: number;
  produto_descricao: string;
  produto_referencia: string;
  produto_tipo: string;
  unidade_codigo?: string | null;
  unidade_descricao?: string | null;
  loja: number;
  loja_nome: string;
  saldo: number | string;
  atualizado_em?: string;
}

export interface ProdutoUsoConsumoMovimentacao {
  id: number;
  empresa: number;
  produto: number;
  produto_descricao: string;
  produto_referencia: string;
  produto_tipo: string;
  loja: number;
  loja_nome: string;
  tipo: string;
  quantidade: number | string;
  saldo_anterior: number | string;
  saldo_posterior: number | string;
  data_movimento: string;
  documento?: string | null;
  origem?: string | null;
  destino?: string | null;
  motivo?: string | null;
}

export type TipoMovimentoEstoque = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'RESERVA';

export interface EstoqueMovimentacao {
  Idmovimento?: number;
  Idloja: number;
  CodigodeBarra: string;
  referencia?: string;
  tipo: TipoMovimentoEstoque;
  quantidade: number;
  custo_unitario?: number | string;
  custo_total?: number | string;
  custo_medio_apos?: number | string;
  saldo_anterior?: number;
  saldo_posterior?: number;
  documento?: string | null;
  observacao?: string | null;
  data_movimento?: string;
}

export interface InventarioEstoque {
  Idinventario?: number;
  Idloja: number;
  descricao: string;
  status: 'ABERTO' | 'VALIDADO' | 'FECHADO' | 'CANCELADO';
  data_abertura: string;
  data_fechamento?: string | null;
  observacao?: string | null;
  itens?: InventarioEstoqueItem[];
  total_itens?: number;
  total_contados?: number;
  total_divergencias?: number;
  saldo_sistema_total?: number | string;
  saldo_contado_total?: number | string;
  diferenca_total?: number | string;
  movimentos_gerados?: number;
  documento?: string;
}

export interface InventarioEstoqueItem {
  Idinventarioitem?: number;
  inventario: number;
  CodigodeBarra: string;
  referencia: string;
  saldo_sistema: number;
  saldo_contado: number;
  diferenca?: number;
  contado?: boolean;
  observacao?: string | null;
}
