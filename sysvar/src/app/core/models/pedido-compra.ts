// src/app/core/models/pedido-compra.ts

export type PedidoTipo = '1' | '2'; // 1=Revenda, 2=Uso/Consumo
export type PedidoStatus = 'AB' | 'AP' | 'CA';

export interface PedidoCompraItem {
  id: number;
  pedido: number;
  produto: number | null;
  cor: number | null;
  pack: number | null;
  n_packs: number;
  descricao_livre: string | null;
  qtd: number;
  preco_unit: number;
  desconto_valor: number;
  total_item: number;
  observacoes: string | null;
}

export interface PedidoCompraParcela {
  id: number;
  pedido: number;
  parcela_n: number;
  vencimento: string;          // ISO date
  valor: number;
  percentual: number | null;
  origem: 'FORMA' | 'MANUAL';
  status: 'PLAN' | 'GERADA' | 'CANC';
  pagar_item_id: number | null;
  data_cadastro: string;
}

export interface PedidoCompra {
  id: number;
  tipo: PedidoTipo;
  loja: number;
  fornecedor: number;
  emissao: string;               // ISO date
  previsao_entrega: string | null;
  forma_pagamento: string | null;
  status: PedidoStatus;
  total_itens: number;
  total_desconto: number;
  frete: number;
  total_pedido: number;
  observacoes?: string | null;
  data_cadastro: string;
  itens?: PedidoCompraItem[];
  parcelas?: PedidoCompraParcela[];
}

/**
 * Linha de listagem (consulta). Backend hoje devolve o Pedido completo;
 * o service faz o "mapeamento visual" para esse shape.
 */
export interface PedidoCompraRow {
  id: number;
  emissao: string;
  previsao_entrega: string | null;
  status: PedidoStatus;
  total_pedido: number;
  fornecedor: number;
  loja: number;
  fornecedor_nome?: string;
  loja_nome?: string;
}
