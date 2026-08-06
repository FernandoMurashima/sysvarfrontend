export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type TipoPessoaCliente = 'PF' | 'PJ';

export interface Cliente {
  id?: number;
  empresa?: number;
  empresa_nome?: string;
  tipo_pessoa?: TipoPessoaCliente;
  // documento é a fonte funcional atual; cpf permanece legado temporário só para leitura/compatibilidade.
  documento?: string;
  cliente_padrao?: boolean;

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
  motivo_bloqueio?: string | null;
  observacao_bloqueio?: string | null;
  bloqueado_em?: string | null;
  bloqueado_por?: number | null;
  bloqueado_por_nome?: string | null;
  aniversario?: string | null;   // yyyy-MM-dd
  mala_direta?: boolean;
  aceita_email?: boolean;
  aceita_whatsapp?: boolean;
  aceita_sms?: boolean;
  consentimento_em?: string | null;
  origem_consentimento?: string | null;
  consentimento_observacao?: string | null;
  ativo?: boolean;
  data_cadastro?: string;
  ultima_compra?: string | null;
  total_comprado?: string | number;
  quantidade_compras?: number;
  ticket_medio?: string | number;
  can_delete?: boolean;
}

export interface ClienteIndicadores {
  total: number;
  ativos: number;
  inativos: number;
  bloqueados: number;
  pessoas_fisicas: number;
  pessoas_juridicas: number;
  clientes_identificados: number;
  cliente_padrao: number;
  com_consentimento: number;
  clientes_com_compras: number;
  clientes_sem_compras: number;
}

export interface ClienteFiltros {
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  ativo?: string;
  bloqueio?: string;
  tipo_pessoa?: string;
  cidade?: string;
  estado?: string;
  documento?: string;
  email?: string;
  categoria?: string;
  cliente_padrao?: string;
  com_compras?: string;
  sem_compras?: string;
}

export interface ClienteBloqueioPayload {
  motivo: string;
  observacao?: string | null;
}

export interface ClienteHistoricoItem {
  id: number;
  created_at: string;
  acao: string;
  acao_descricao: string;
  usuario?: string | null;
  origem?: string | null;
  resultado?: string | null;
  campos_alterados: string[];
  motivo?: string | null;
  observacao?: string | null;
}

export type ClienteHistoricoResponse = PaginatedResponse<ClienteHistoricoItem>;
