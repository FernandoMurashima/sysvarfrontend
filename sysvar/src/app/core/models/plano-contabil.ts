export type ClasseContaContabil = 'ATIVO' | 'PASSIVO' | 'PATRIMONIO' | 'RECEITA' | 'CUSTO' | 'DESPESA' | 'RESULTADO';
export type NaturezaContaContabil = 'DEBITO' | 'CREDITO';

export interface PlanoContabil {
  id?: number;
  empresa?: number | null;
  codigo: string;
  descricao: string;
  classe: ClasseContaContabil | string;
  natureza: NaturezaContaContabil | string;
  conta_pai?: number | null;
  conta_pai_codigo?: string | null;
  conta_pai_descricao?: string | null;
  nivel?: number;
  analitica?: boolean;
  ativa?: boolean;
  data_cadastro?: string;
}
