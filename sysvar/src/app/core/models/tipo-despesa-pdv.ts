export interface TipoDespesaPdv {
  Idtipodespesapdv: number;
  empresa?: number | null;
  codigo: string;
  descricao: string;
  Idnatureza: number;
  natureza_codigo?: string;
  natureza_descricao?: string;
  ativo: boolean;
  exige_documento: boolean;
  data_cadastro?: string;
}
