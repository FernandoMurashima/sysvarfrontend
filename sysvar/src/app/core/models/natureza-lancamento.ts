export interface NatLancamento {
  idnatureza?: number;
  empresa?: number | null;

  codigo: string;                 // max 10
  categoria_principal: string;    // max 50
  subcategoria: string;           // max 50
  descricao: string;              // max 255
  tipo: string;                   // max 20
  status: string;                 // max 10
  tipo_natureza: string;          // max 10
  natureza_operacao?: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA' | 'AJUSTE' | string;
  categoria_gerencial?: string | null;
  movimenta_financeiro?: boolean;
  entra_dre?: boolean;
  plano_contabil?: number | null;
  plano_contabil_codigo?: string | null;
  plano_contabil_descricao?: string | null;
  conta_contabil?: string | null;
  ativo?: boolean;
}
