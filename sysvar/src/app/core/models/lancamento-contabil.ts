export type StatusLancamentoContabil = 'GERADO' | 'PENDENTE' | 'ESTORNADO';

export interface LancamentoContabil {
  Idlancamentocontabil: number;
  empresa: number;
  idloja: number;
  loja_nome?: string;
  movimentacao: number;
  data_lancamento: string;
  documento?: string | null;
  historico: string;
  origem: string;
  natureza?: number | null;
  natureza_descricao?: string | null;
  conta_debito?: number | null;
  conta_debito_codigo?: string | null;
  conta_debito_descricao?: string | null;
  conta_credito?: number | null;
  conta_credito_codigo?: string | null;
  conta_credito_descricao?: string | null;
  valor: string | number;
  status: StatusLancamentoContabil;
  observacao?: string;
  data_cadastro?: string;
}

export type LancamentoContabilListResp =
  | LancamentoContabil[]
  | { results: LancamentoContabil[]; count: number };
