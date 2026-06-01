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

export interface RelatorioVendasResumo {
  vendas: number;
  itens: number;
  total: string;
  ticket_medio: string;
  comissao_total: string;
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

export interface RelatorioProdutoVenda {
  produto: string;
  referencia: string;
  quantidade: number;
  total: string;
}

export interface RelatorioColecaoVenda {
  colecao: string;
  quantidade: number;
  total: string;
}

export interface RelatorioVendas {
  resumo: RelatorioVendasResumo;
  vendedores: RelatorioVendedor[];
  produtos: RelatorioProdutoVenda[];
  colecoes: RelatorioColecaoVenda[];
}
