export type TipoMovimentacaoFinanceira = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA';
export type StatusMovimentacaoFinanceira = 'PREVISTA' | 'EFETIVA' | 'CANCELADA';
export type OrigemMovimentacaoFinanceira = 'MANUAL' | 'PAGAR' | 'RECEBER';

export interface MovimentacaoFinanceira {
  Idmovimentacao?: number;
  idloja: number;
  data_movimento: string;
  tipo: TipoMovimentacaoFinanceira;
  status: StatusMovimentacaoFinanceira;
  origem: OrigemMovimentacaoFinanceira;
  valor: string | number;
  historico: string;
  documento?: string | null;
  Idnatureza?: number | null;
  FormaPagamento?: string | null;
  caixa?: number | null;
  conta_bancaria?: number | null;
  pagar_item?: number | null;
  receber_item?: number | null;
  data_cadastro?: string;
}
