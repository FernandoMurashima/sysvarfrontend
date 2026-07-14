export interface Empresa {
  id?: number;
  nome: string;
  nome_fantasia?: string | null;
  documento?: string | null;
  ativo?: boolean;
  licenca_master?: boolean;
  usa_vendas?: boolean;
  usa_compras?: boolean;
  usa_estoque?: boolean;
  usa_financeiro?: boolean;
  usa_fiscal?: boolean;
  usa_producao?: boolean;
  usa_ficha_tecnica?: boolean;
  usa_faccao?: boolean;
  usa_distribuicao_producao?: boolean;
  data_cadastro?: string;
}
