export type DistribuicaoStatus = 'RASC' | 'CALC' | 'CONF' | 'PED' | 'FATUR' | 'NF' | 'TRANS' | 'PARC' | 'RECB' | 'CANC';
export type PerfilDistribuicaoTipo = 'MANUAL' | 'PERCENTUAL' | 'FIXA' | 'METRICA';

export interface PerfilDistribuicaoItem {
  id?: number;
  perfil?: number;
  loja: number;
  loja_nome?: string;
  percentual: number | string;
  quantidade_fixa: number | string;
  prioridade: number;
  ativo: boolean;
}

export interface PerfilDistribuicao {
  id?: number;
  empresa?: number;
  codigo: string;
  descricao: string;
  tipo: PerfilDistribuicaoTipo;
  fator_preco?: number | string;
  ativo: boolean;
  total_percentual?: number | string;
  itens?: PerfilDistribuicaoItem[];
}

export interface DistribuicaoDestino {
  id?: number;
  distribuicao: number;
  item: number;
  loja_destino: number;
  loja_nome?: string;
  quantidade_sugerida: number | string;
  quantidade_ajustada: number | string;
  quantidade_confirmada: number | string;
  percentual: number | string;
  prioridade: number;
  bloqueado_recalculo: boolean;
  status: 'RASC' | 'CONF' | 'PED' | 'CANC';
}

export interface DistribuicaoItem {
  id?: number;
  distribuicao: number;
  produto: number;
  sku: number;
  referencia: string;
  descricao: string;
  cor_descricao?: string | null;
  tamanho_descricao?: string | null;
  ean13: string;
  estoque_fisico: number | string;
  estoque_reservado: number | string;
  estoque_disponivel: number | string;
  quantidade_selecionada: number | string;
  custo_unitario: number | string;
  custo_total: number | string;
  bloqueado_recalculo: boolean;
  destinos?: DistribuicaoDestino[];
}

export interface Distribuicao {
  id?: number;
  empresa?: number;
  numero: string;
  unidade_origem: number;
  unidade_origem_nome?: string;
  data: string;
  tipo: PerfilDistribuicaoTipo;
  perfil?: number | null;
  perfil_descricao?: string | null;
  fator_preco: number | string;
  origem_operacao: 'MANUAL' | 'PRODUCAO' | 'COMPRA';
  origem_id?: number | null;
  status: DistribuicaoStatus;
  observacao?: string | null;
  quantidade_total: number | string;
  valor_total_custo: number | string;
  valor_total_venda: number | string;
  pedidos_count?: number;
  itens?: DistribuicaoItem[];
  destinos?: DistribuicaoDestino[];
}

export interface PedidoVendaDistribuicao {
  id?: number;
  numero: string;
  distribuicao: number;
  distribuicao_numero?: string;
  unidade_origem: number;
  unidade_origem_nome?: string;
  loja_destino: number;
  loja_destino_nome?: string;
  data_pedido: string;
  status: 'AB' | 'AGF' | 'FAT' | 'CANC';
  quantidade_total: number | string;
  valor_total_custo: number | string;
  valor_total_venda: number | string;
  faturamento_status: string;
  nfe_numero?: string | null;
  nfe_status?: string | null;
  itens_count?: number;
  itens?: PedidoVendaDistribuicaoItem[];
}

export interface PedidoVendaDistribuicaoItem {
  id?: number;
  pedido: number;
  produto: number;
  sku: number;
  referencia: string;
  descricao: string;
  cor_descricao?: string | null;
  tamanho_descricao?: string | null;
  ean13: string;
  quantidade: number | string;
  custo_unitario: number | string;
  preco_unitario: number | string;
  total_custo: number | string;
  total_item: number | string;
}

export interface MercadoriaTransito {
  id: number;
  pedido: number;
  pedido_item: number;
  distribuicao_destino: number;
  unidade_origem: number;
  unidade_origem_nome?: string;
  loja_destino: number;
  loja_destino_nome?: string;
  sku: number;
  ean13: string;
  quantidade_enviada: number | string;
  quantidade_recebida: number | string;
  quantidade_divergente: number | string;
  data_envio?: string | null;
  data_recebimento?: string | null;
  status: 'AG_EXP' | 'TRANS' | 'RECB' | 'DIV';
  pedido_numero?: string;
  nfe_numero?: string | null;
  nfe_chave?: string | null;
  referencia?: string;
  descricao?: string;
  cor_descricao?: string | null;
  tamanho_descricao?: string | null;
  custo_unitario?: number | string;
  valor_unitario?: number | string;
  recebido_ui?: number | string;
}
