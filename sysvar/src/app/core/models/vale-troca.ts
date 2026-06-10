export interface ValeTroca {
  Idvaletroca?: number;
  documento: string;
  cliente: number;
  cliente_nome?: string;
  loja: number;
  loja_nome?: string;
  devolucao: number;
  devolucao_documento?: string;
  venda_origem_documento?: string;
  valor_original: string;
  saldo: string;
  status: string;
  validade?: string | null;
  observacao?: string;
  criado_em?: string;
  movimentos?: ValeTrocaMovimento[];
}

export interface ValeTrocaSaldo {
  cliente: number;
  saldo: string;
}

export interface ValeTrocaMovimento {
  Idvaletrocamov?: number;
  vale: number;
  venda_uso?: number | null;
  venda_documento?: string;
  tipo: string;
  valor: string;
  saldo_apos: string;
  observacao?: string;
  criado_em?: string;
}
