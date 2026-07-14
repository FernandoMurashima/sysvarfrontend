export interface Loja {
  id?: number;
  Idloja?: number; // compat antigo

  empresa?: number | null;
  empresa_nome?: string | null;

  nome_loja: string;
  apelido_loja?: string;
  Apelido_loja?: string; // compat antigo
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

  // flags/datas novos
  EstoqueNegativo?: string;   // "SIM" | "NAO" | null
  Rede?: string;              // "SIM" | "NAO" | null
  Matriz?: string;            // "SIM" | "NAO" | null
  tipo_unidade?: 'LOJA' | 'MATRIZ' | 'FABRICA' | string | null;
  regime_tributario?: 'SIMPLES' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | string | null;
  ambiente_fiscal?: 'HOMOLOGACAO' | 'PRODUCAO' | string | null;
  inscricao_estadual?: string | null;
  serie_nfce?: number;
  proximo_numero_nfce?: number;
  serie_nfe?: number;
  proximo_numero_nfe?: number;
  emite_nfce?: boolean;
  emite_nfe?: boolean;
  ativo?: boolean;
  DataAbertura?: string | null;    // yyyy-MM-dd
  DataEnceramento?: string | null;  // yyyy-MM-dd

  data_cadastro?: string;
}
