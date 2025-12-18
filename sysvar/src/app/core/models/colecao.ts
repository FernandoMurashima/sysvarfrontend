export interface Colecao {
  Idcolecao?: number;
  Descricao: string;
  Codigo: string | null;   // "26"
  Estacao: string | null;  // "01".."04"
  Status: string | null;   // "CR".."AR"
  Contador: number | null;
  data_cadastro?: string;
}
