export interface Fornecedor {
  id?: number;

  nome_fornecedor: string;
  apelido?: string;
  cnpj?: string;

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

  categoria?: 'MATERIA_PRIMA' | 'AVIAMENTO' | 'REVENDA' | 'FACCAO' | 'PRESTADOR' | 'TRANSPORTADORA' | 'OUTROS' | string;
  bloqueio?: boolean;
  mala_direta?: boolean;
  conta_contabil?: string;

  ativo?: boolean;
  data_cadastro?: string;
}
