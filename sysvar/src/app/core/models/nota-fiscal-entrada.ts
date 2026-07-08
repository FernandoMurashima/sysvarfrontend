export interface NotaFiscalEntrada {
  id: number;
  pedido_compra: number;
  modelo: string;
  serie: string;
  numero: string;
  chave_acesso: string;
  dt_emissao: string;
  dt_entrada: string;
  status: 'AB' | 'FE' | 'CA';
  valor_produtos: string;
  valor_desconto: string;
  valor_frete: string;
  valor_total: string;
  observacoes: string;
  criado_por?: number | null;
  criado_em?: string;
  atualizado_em?: string;
  itens?: NotaFiscalEntradaItem[];
}

export interface NotaFiscalEntradaItem {
  id: number;
  nota: number;
  pedido_item: number;
  qtd_recebida: string;
  preco_unit_nf: string;
  desconto_item: string;
  total_item: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface NotaFiscalEntradaPedidoItem {
  pedido_item: number;
  nota_item: number | null;
  produto: number | null;
  produto_descricao?: string | null;
  produto_referencia?: string | null;
  cor: number | null;
  cor_nome?: string | null;
  pack: number | null;
  pack_nome?: string | null;
  descricao_livre: string | null;
  qtd_pedido: string;
  qtd_recebida_outras_notas: string;
  qtd_na_nota: string;
  saldo_total_recebivel: string;
  saldo_pendente: string;
  preco_unit_pedido: string;
  qtd_pack?: string | null;
  n_packs?: number | null;
  quantidades_validas?: string[];
}
