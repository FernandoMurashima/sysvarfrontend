export interface Estoque {
  Idestoque?: number;
  CodigodeBarra: string;
  referencia: string;
  Idloja: number;
  Estoque: number | null;
  reserva: number | null;
}

export type TipoMovimentoEstoque = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'RESERVA';

export interface EstoqueMovimentacao {
  Idmovimento?: number;
  Idloja: number;
  CodigodeBarra: string;
  referencia?: string;
  tipo: TipoMovimentoEstoque;
  quantidade: number;
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
  status: 'ABERTO' | 'FECHADO' | 'CANCELADO';
  data_abertura: string;
  data_fechamento?: string | null;
  observacao?: string | null;
  itens?: InventarioEstoqueItem[];
}

export interface InventarioEstoqueItem {
  Idinventarioitem?: number;
  inventario: number;
  CodigodeBarra: string;
  referencia: string;
  saldo_sistema: number;
  saldo_contado: number;
  diferenca?: number;
  observacao?: string | null;
}
