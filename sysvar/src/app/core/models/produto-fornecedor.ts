export interface ProdutoFornecedor {
  id: number;
  empresa?: number;
  fornecedor: number;
  fornecedor_nome?: string;
  codigo_produto_fornecedor: string;
  codigo_normalizado?: string;
  descricao_fornecedor?: string | null;
  gtin_ean?: string | null;
  produto: number;
  produto_descricao?: string;
  produto_referencia?: string | null;
  produto_tipo?: string;
  unidade_interna?: string | null;
  unidade_interna_descricao?: string | null;
  unidade_fornecedor: string;
  fator_conversao: string | number;
  ativo: boolean;
  criado_em?: string;
  atualizado_em?: string;
}

export interface ProdutoFornecedorPayload {
  fornecedor: number;
  codigo_produto_fornecedor: string;
  descricao_fornecedor?: string;
  gtin_ean?: string;
  produto: number;
  unidade_fornecedor: string;
  fator_conversao: string | number;
  ativo?: boolean;
}

export interface ProdutoFornecedorUpdatePayload {
  codigo_produto_fornecedor?: string;
  descricao_fornecedor?: string;
  gtin_ean?: string;
  unidade_fornecedor?: string;
  fator_conversao?: string | number;
  ativo?: boolean;
}

export interface PaginatedProdutoFornecedor {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProdutoFornecedor[];
}
