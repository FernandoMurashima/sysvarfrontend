export interface Funcionario {
  id?: number;

  nomefuncionario: string;
  apelido?: string;
  cpf?: string;

  inicio?: string;  // yyyy-MM-dd
  fim?: string;     // yyyy-MM-dd

  categoria?: string;
  meta?: number;

  idloja?: number | null;   // FK (Loja)
  ativo?: boolean;

  data_cadastro?: string;
}
