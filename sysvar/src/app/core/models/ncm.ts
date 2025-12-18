export interface Ncm {
  id?: number;
  ncm: string | null;        // "1234.56.78"
  descricao: string;         // até 1000 no back
  aliquota?: number | null;  // opcional
  campo1?: string | null;    // opcional
}
