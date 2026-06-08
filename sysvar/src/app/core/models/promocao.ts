export type PromocaoTipo = 'DESCONTO_PERCENTUAL' | 'DESCONTO_VALOR' | 'PRECO_FIXO';
export type PromocaoEscopo = 'TODOS' | 'PRODUTO' | 'COLECAO' | 'GRUPO' | 'SUBGRUPO';

export interface Promocao {
  Idpromocao?: number;
  nome: string;
  ativo: boolean;
  data_inicio: string;
  data_fim?: string | null;
  tipo: PromocaoTipo;
  valor: number | string;
  escopo: PromocaoEscopo;
  prioridade: number;
  acumula_cashback: boolean;
  observacao?: string;
  lojas?: number[];
  produtos?: number[];
  colecoes?: number[];
  grupos?: number[];
  subgrupos?: number[];
}

export interface PromocaoAplicavel {
  produto: number;
  promocao: number;
  nome: string;
  tipo: PromocaoTipo;
  valor: string;
  prioridade: number;
  acumula_cashback: boolean;
}
