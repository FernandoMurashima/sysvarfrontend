export interface Caixa {
  Idcaixa?: number;
  idloja?: number | null;
  tipo_caixa?: 'LOJA' | 'MASTER';
  codigo: string;
  descricao: string;
  saldo_inicial: string | number;
  saldo_atual: string | number;
  ativo: boolean;
  data_abertura: string;
  data_cadastro?: string;
}
