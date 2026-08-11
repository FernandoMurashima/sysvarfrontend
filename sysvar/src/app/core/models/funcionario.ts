export interface Funcionario {
  id?: number;
  matricula?: string;
  nomefuncionario: string;
  apelido?: string;
  cpf?: string;

  inicio?: string;  // yyyy-MM-dd
  fim?: string;     // yyyy-MM-dd

  cargo?: number | null;
  cargo_nome?: string;
  cargo_codigo?: string;
  categoria?: string;
  meta?: number;
  situacao?: 'ATIVO' | 'AFASTADO' | 'DESLIGADO';
  situacao_descricao?: string;
  participa_vendas?: boolean;
  comissionado?: boolean;
  comissao_percentual?: number;
  salario?: number | null;
  salario_oculto?: boolean;

  idloja?: number | null;   // FK (Loja)
  loja_nome?: string;
  lojas_supervisionadas?: number[];
  todas_lojas_da_empresa?: boolean;
  usuario?: number | null;
  usuario_nome?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  data_nascimento?: string;
  endereco?: string;
  observacoes?: string;
  ativo?: boolean;

  data_cadastro?: string;
}
