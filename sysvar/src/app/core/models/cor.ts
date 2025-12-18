export interface Cor {
  Idcor?: number;
  Descricao: string;     // rótulo principal (ex.: "Azul Royal")
  Codigo?: string;       // ex.: "AZ", "PR", "BR"
  Cor: string;           // nome completo (ex.: "Azul")
  Status?: string | null; // livre: "ATIVO", "INATIVO", etc.
  data_cadastro?: string;
}
