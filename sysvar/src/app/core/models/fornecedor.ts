export interface Fornecedor {
  id?: number;

  empresa?: number;
  empresa_nome?: string;
  tipo_pessoa?: 'PF' | 'PJ';
  documento?: string | null;
  nome_fornecedor: string;
  apelido?: string;
  cnpj?: string | null;

  logradouro?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;

  telefone1?: string;
  telefone2?: string;
  email?: string;

  categoria?: FornecedorCategoria | string | null;
  categorias?: FornecedorCategoria[];
  categorias_lista?: FornecedorCategoria[];
  bloqueio?: boolean;
  motivo_bloqueio?: string | null;
  observacao_bloqueio?: string | null;
  bloqueado_em?: string | null;
  bloqueado_por?: number | null;
  bloqueado_por_nome?: string | null;
  mala_direta?: boolean;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  contribuinte_icms?: string | null;
  site?: string | null;
  prazo_padrao_pagamento?: number | null;
  observacoes_comerciais?: string | null;
  conta_contabil?: string | null;
  natureza_padrao?: number | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  tipo_conta?: string | null;
  chave_pix?: string | null;
  favorecido?: string | null;
  documento_favorecido?: string | null;
  observacao_bancaria?: string | null;
  dados_bancarios_ocultos?: boolean;
  contatos?: FornecedorContato[];
  enderecos?: FornecedorEndereco[];
  ultima_compra?: string | null;
  total_comprado?: string | number;
  quantidade_compras?: number;
  ticket_medio?: string | number;
  saldo_a_pagar?: string | number;

  ativo?: boolean;
  data_cadastro?: string;
}

export type FornecedorCategoria = 'MATERIA_PRIMA' | 'AVIAMENTO' | 'REVENDA' | 'FACCAO' | 'PRESTADOR' | 'TRANSPORTADORA' | 'OUTROS';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface FornecedorContato {
  id?: number;
  nome: string;
  cargo_funcao?: string | null;
  tipo?: 'COMERCIAL' | 'FINANCEIRO' | 'FISCAL' | 'PRODUCAO_FACCAO' | 'LOGISTICA' | 'OUTRO';
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  observacao?: string | null;
  principal?: boolean;
  ativo?: boolean;
}

export interface FornecedorEndereco {
  id?: number;
  tipo?: 'FISCAL' | 'COMERCIAL' | 'COBRANCA' | 'RETIRADA_COLETA' | 'ENTREGA' | 'UNIDADE_FABRIL' | 'OUTRO';
  logradouro?: string | null;
  endereco: string;
  numero?: string | null;
  complemento?: string | null;
  cep?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  principal?: boolean;
  ativo?: boolean;
  observacao?: string | null;
}

export interface FornecedorBloqueioPayload {
  motivo: string;
  observacao?: string;
}

export interface FornecedorHistoricoItem {
  id: number;
  created_at: string;
  acao: string;
  acao_descricao: string;
  usuario?: string | null;
  origem?: string | null;
  resultado?: string | null;
  campos_alterados?: string[];
  motivo?: string | null;
  observacao?: string | null;
}
