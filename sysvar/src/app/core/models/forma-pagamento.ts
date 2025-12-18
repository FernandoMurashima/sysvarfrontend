// src/app/core/models/forma-pagamento.ts

export interface FormaPagamentoParcela {
  Idformapagparcela?: number;
  forma?: number;               // FK para FormaPagamento
  ordem: number;
  dias: number;
  percentual?: string | number | null;
  valor_fixo?: string | number | null;
  data_cadastro?: string;
}

export interface FormaPagamento {
  Idformapagamento?: number;
  id?: number;                  // compat futuro, se o DRF expuser "id"
  codigo: string;
  descricao: string;
  num_parcelas: number;
  ativo: boolean;
  data_cadastro?: string;
  parcelas?: FormaPagamentoParcela[];
}
