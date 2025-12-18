export interface Loja {
  id?: number;
  Idloja?: number; // compat antigo

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
  DataAbertura?: string | null;    // yyyy-MM-dd
  DataEnceramento?: string | null;  // yyyy-MM-dd

  // nome do backend é ContaContabil; no form usamos conta_contabil
  ContaContabil?: string | null;
  conta_contabil?: string | null;

  data_cadastro?: string;
}
