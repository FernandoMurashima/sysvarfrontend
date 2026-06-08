export interface CashbackConfig {
  Idcashbackconfig?: number;
  nome: string;
  ativo: boolean;
  percentual: string | number;
  validade_dias: number;
  valor_minimo_geracao: string | number;
  valor_minimo_uso: string | number;
  limite_uso_percentual: string | number;
  consumidor_final_participa: boolean;
  atualizado_em?: string;
  criado_em?: string;
}

export interface CashbackMovimento {
  Idcashbackmovimento?: number;
  cliente: number;
  cliente_nome?: string;
  venda_origem?: number | null;
  venda_uso?: number | null;
  documento_origem?: string;
  documento_uso?: string;
  tipo: 'CREDITO' | 'DEBITO' | 'ESTORNO' | 'EXPIRACAO';
  status: 'ATIVO' | 'CANCELADO';
  valor: string | number;
  validade?: string | null;
  observacao?: string;
  criado_em?: string;
}

export interface CashbackSaldo {
  cliente: number;
  saldo: string;
}
