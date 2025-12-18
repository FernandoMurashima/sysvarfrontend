export interface Cliente {
  id?: number;

  nome_cliente: string;
  apelido?: string;
  cpf?: string;

  logradouro?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;

  cep?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;        // UF

  telefone1?: string;
  telefone2?: string;
  email?: string;

  categoria?: string;
  bloqueio?: boolean;
  aniversario?: string | null;   // yyyy-MM-dd
  mala_direta?: boolean;

  conta_contabil?: string;

  ativo?: boolean;
  data_cadastro?: string;
}
