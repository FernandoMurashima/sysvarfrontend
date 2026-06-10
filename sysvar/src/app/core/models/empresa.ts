export interface Empresa {
  id?: number;
  nome: string;
  nome_fantasia?: string | null;
  documento?: string | null;
  ativo?: boolean;
  data_cadastro?: string;
}
