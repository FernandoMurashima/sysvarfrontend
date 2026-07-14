export interface RegraTributaria {
  id?: number;
  empresa?: number;
  nome: string;
  tributo: number;
  tributo_codigo?: string;
  tributo_descricao?: string;
  cfop?: number | null;
  cfop_codigo?: string | null;
  ncm?: number | null;
  ncm_codigo?: string | null;
  tipo_operacao: string;
  regime_tributario: string;
  tipo_produto: string;
  uf_origem?: string | null;
  uf_destino?: string | null;
  cst_csosn?: string | null;
  base_calculo: string;
  aliquota: number;
  reducao_base: number;
  permite_credito: boolean;
  compoe_custo: boolean;
  entra_dre: boolean;
  ativo: boolean;
  vigencia_inicio: string;
  vigencia_fim?: string | null;
  observacoes?: string | null;
}
