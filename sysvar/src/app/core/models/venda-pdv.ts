export interface VendaPdvItemPayload {
  ean: string;
  descricao: string;
  cor: string;
  tamanho: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
}

export interface VendaPdvPagamentoPayload {
  forma: string;
  descricao: string;
  valor: number;
  autorizacao?: string;
}

export interface FinalizarVendaPdvPayload {
  loja: number;
  caixa: number;
  cliente: number;
  vendedor: number;
  forma_pagamento: string;
  desconto_geral: number;
  valor_recebido: number;
  pagamentos: VendaPdvPagamentoPayload[];
  itens: VendaPdvItemPayload[];
}

export interface NFCeResumo {
  id: number;
  ambiente: string;
  modelo: string;
  serie: number;
  numero: number;
  status: string;
  chave_acesso: string;
  protocolo: string;
  qr_code_url: string;
  retorno_codigo: string;
  retorno_mensagem: string;
  autorizada_em?: string;
}

export interface CupomPdv {
  empresa: string;
  cnpj: string;
  endereco: string;
  documento: string;
  data: string;
  cliente: string;
  vendedor: string;
  itens: Array<{
    descricao: string;
    ean: string;
    quantidade: number;
    preco_unitario: string;
    desconto: string;
    total_item: string;
  }>;
  subtotal: string;
  desconto: string;
  total: string;
  forma_pagamento: string;
  valor_recebido: string;
  troco: string;
  cashback_gerado: string;
  cashback_usado: string;
  pagamentos: Array<{
    forma: string;
    descricao: string;
    valor: string;
    autorizacao?: string;
  }>;
  nfce: NFCeResumo;
}

export interface VendaPdv {
  id: number;
  documento: string;
  status: string;
  total: string;
  nfce?: NFCeResumo;
  cupom?: CupomPdv;
}

export interface VendaDevolucaoItemConsulta {
  id: number;
  produto: number;
  sku: number;
  ean: string;
  referencia: string;
  descricao: string;
  cor: string;
  tamanho: string;
  quantidade: number;
  quantidade_devolvida: number;
  quantidade_disponivel: number;
  preco_unitario: string;
  desconto: string;
  total_item: string;
}

export interface VendaDevolucaoConsulta {
  id: number;
  documento: string;
  data_venda: string;
  loja: number;
  loja_nome: string;
  cliente: number;
  cliente_nome: string;
  vendedor_nome: string;
  total: string;
  cashback_gerado: string;
  cashback_usado: string;
  nfce?: NFCeResumo | null;
  itens: VendaDevolucaoItemConsulta[];
}

export interface FinalizarDevolucaoVendaPayload {
  venda: number;
  motivo: string;
  itens: Array<{
    venda_item: number;
    quantidade: number;
  }>;
}

export interface VendaDevolucao {
  id: number;
  documento: string;
  status: string;
  motivo: string;
  subtotal: string;
  credito_cliente: string;
  venda: number;
  loja: number;
  cliente: number;
  criado_em: string;
  nfe_devolucao?: {
    id: number;
    modelo: string;
    serie: number;
    numero: number;
    status: string;
    retorno_mensagem: string;
  };
  vale_troca?: {
    id: number;
    documento: string;
    valor_original: string;
    saldo: string;
    status: string;
  } | null;
  venda_origem?: VendaDevolucaoConsulta;
}

export interface RelatorioVendasResumo {
  vendas: number;
  itens: number;
  subtotal: string;
  descontos: string;
  total: string;
  ticket_medio: string;
  comissao_total: string;
  cashback_gerado: string;
  cashback_usado: string;
}

export interface RelatorioLojaVenda {
  loja: string;
  vendas: number;
  itens: number;
  total: string;
  ticket_medio: string;
}

export interface RelatorioVendedor {
  vendedor: string;
  vendas: number;
  itens: number;
  total: string;
  ticket_medio: string;
  comissao_percentual: string;
  comissao: string;
}

export interface RelatorioPagamentoVenda {
  forma: string;
  descricao: string;
  vendas: number;
  total: string;
}

export interface RelatorioProdutoVenda {
  produto: string;
  referencia: string;
  colecao: string;
  grupo: string;
  subgrupo: string;
  quantidade: number;
  total: string;
}

export interface RelatorioColecaoVenda {
  colecao: string;
  quantidade: number;
  total: string;
}

export interface RelatorioGrupoVenda {
  grupo: string;
  quantidade: number;
  total: string;
}

export interface RelatorioSubgrupoVenda {
  grupo: string;
  subgrupo: string;
  quantidade: number;
  total: string;
}

export interface RelatorioVendas {
  resumo: RelatorioVendasResumo;
  lojas: RelatorioLojaVenda[];
  vendedores: RelatorioVendedor[];
  pagamentos: RelatorioPagamentoVenda[];
  produtos: RelatorioProdutoVenda[];
  colecoes: RelatorioColecaoVenda[];
  grupos: RelatorioGrupoVenda[];
  subgrupos: RelatorioSubgrupoVenda[];
}
