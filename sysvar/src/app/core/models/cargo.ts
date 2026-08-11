export interface Cargo {
  id?: number;
  empresa?: number;
  empresa_nome?: string;
  codigo: string;
  descricao: string;
  ativo?: boolean;
  participa_vendas?: boolean;
  permite_comissao?: boolean;
  autoridade_operacional_loja?: boolean;
  permite_multiplas_lojas?: boolean;
  gerencial?: boolean;
  data_cadastro?: string;
  data_atualizacao?: string;
}
