import { MovimentacaoFinanceira } from './movimentacao-financeira';

export interface AntecipacaoRecebivelItem {
  Idantecipacaoitem?: number;
  antecipacao: number;
  movimentacao: number;
  receber_item: number;
  valor_bruto: string | number;
  taxa_valor: string | number;
  valor_liquido: string | number;
  documento?: string;
  vencimento?: string;
  forma_pagamento?: string;
}

export interface AntecipacaoRecebivel {
  Idantecipacao?: number;
  empresa?: number | null;
  idloja: number;
  loja_nome?: string;
  conta_bancaria: number;
  conta_nome?: string;
  documento: string;
  data_antecipacao: string;
  taxa_percentual: string | number;
  valor_bruto: string | number;
  taxa_valor: string | number;
  valor_liquido: string | number;
  status: 'EFETIVA' | 'CANCELADA';
  observacao?: string;
  itens?: AntecipacaoRecebivelItem[];
}

export interface AntecipacaoResultado extends AntecipacaoRecebivel {}

export type RecebivelAntecipacao = MovimentacaoFinanceira;
