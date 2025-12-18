export interface TamanhoModel {
  Idtamanho: number;
  idgrade: number;        // FK para Grade.Idgrade
  Tamanho: string;        // ex.: PP, P, M, 36, 38
  Descricao: string;      // rótulo amigável
  Status?: string | null;
  data_cadastro?: string;
}
