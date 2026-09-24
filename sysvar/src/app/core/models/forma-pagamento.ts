// src/app/core/models/forma-pagamento.ts

export type TipoFormaPagamento =
  | 'DINHEIRO'
  | 'PIX'
  | 'DEBITO'
  | 'CREDITO'
  | 'BOLETO'
  | 'TRANSFERENCIA'
  | 'OUTRO';

export type FinalidadePrazoPagamento = 'PAGAR' | 'RECEBER' | 'AMBOS';

export interface PrazoPagamentoParcela {
  Idprazoparcela?: number;
  prazo?: number;
  ordem: number;
  dias: number;
  percentual?: string | number | null;
  data_cadastro?: string;
}

export interface PrazoPagamento {
  Idprazo?: number;
  id?: number;
  codigo: string;
  descricao: string;
  finalidade?: FinalidadePrazoPagamento;
  num_parcelas: number;
  intervalo_dias: number;
  ativo: boolean;
  data_cadastro?: string;
  parcelas?: PrazoPagamentoParcela[];
}

export interface FormaPagamento {
  Idformapagamento?: number;
  id?: number;                  // compat futuro, se o DRF expuser "id"
  codigo: string;
  descricao: string;
  tipo?: TipoFormaPagamento;
  ativo: boolean;
  conta_liquidacao?: number | null;
  prazo_pagamento?: number | null;
  gera_recebivel_bancario?: boolean;
  prazo_credito_dias?: number;
  tef_habilitado?: boolean;
  tef_modalidade?: string;
  tef_adquirente_codigo?: string;
  tef_terminal_logico?: string;
  data_cadastro?: string;
}

export interface Adquirente {
  Idadquirente?: number;
  id?: number;
  codigo: string;
  descricao: string;
  ativo: boolean;
  data_cadastro?: string;
}

export interface CondicaoAdquirente {
  Idcondicaoadquirente?: number;
  id?: number;
  adquirente: number;
  forma_pagamento: number;
  prazo_pagamento: number;
  taxa_percentual: string | number;
  taxa_fixa: string | number;
  ativo: boolean;
  data_cadastro?: string;
  adquirente_codigo?: string;
  adquirente_descricao?: string;
  forma_codigo?: string;
  forma_descricao?: string;
  prazo_codigo?: string;
  prazo_descricao?: string;
}
