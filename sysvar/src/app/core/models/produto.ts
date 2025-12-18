export interface Produto {
  Idproduto?: number;
  tipo_produto: '1' | '2';        // '1' Revenda | '2' Uso/Consumo
  referencia?: string | null;     // read-only (gerada no back p/ Revenda)

  descricao: string;
  descricao_reduzida?: string | null;

  unidade: number | null;         // FK id
  grupo: number | null;           // FK id
  subgrupo?: number | null;       // FK id
  colecao: number | null;         // FK id
  material?: number | null;       // FK id
  grade?: number | null;          // FK id (obrigatória se tipo = '1')

  // Fiscal
  ncm?: string | null;            // ####.##.##
  origem_mercadoria?: number | null;
  csosn_ou_cst_icms?: string | null;
  aliquota_icms?: number | null;
  cfop_venda_dentro?: string | null;
  cfop_venda_fora?: string | null;
  cst_pis?: string | null;
  aliq_pis?: number | null;
  cst_cofins?: string | null;
  aliq_cofins?: number | null;
  ipi_situacao?: string | null;
  aliq_ipi?: number | null;

  // Estado
  ativo?: boolean;
  bloqueado_venda?: boolean;

  observacoes?: string | null;
  data_cadastro?: string | null;
  data_inativo?: string | null;
}
