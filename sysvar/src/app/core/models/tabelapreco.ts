export interface TabelaPreco {
  Idtabela?: number;
  NomeTabela: string;
  DataInicio: string;         // yyyy-MM-dd
  Promocao: boolean;
  DataFim?: string | null;    // opcional
  data_cadastro?: string;
}
