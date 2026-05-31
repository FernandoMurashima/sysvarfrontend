export type TipoContaBancaria = 'CORRENTE' | 'POUPANCA' | 'PAGAMENTO';

export interface ContaBancaria {
  Idconta?: number;
  idloja: number;
  descricao: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: TipoContaBancaria;
  pix_chave?: string | null;
  saldo_inicial: string | number;
  saldo_atual: string | number;
  ativo: boolean;
  data_cadastro?: string;
}
