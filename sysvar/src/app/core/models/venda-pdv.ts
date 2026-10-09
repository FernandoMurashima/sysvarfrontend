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
  documento?: string;
  local_uuid?: string;
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
    ncm?: string;
    cfop?: string;
    total_impostos?: string;
  }>;
  subtotal: string;
  desconto: string;
  total: string;
  total_impostos?: string;
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

export interface VendaConsultaPessoa {
  id: number;
  nome: string;
  documento?: string;
}

export interface VendaConsultaLoja {
  id: number;
  nome: string;
}

export interface VendaConsultaCaixa {
  id: number;
  codigo: string;
  descricao: string;
}

export interface VendaConsultaOperador {
  id: number;
  username: string;
  nome: string;
}

export interface VendaConsultaPagamento {
  forma: string;
  codigo: string;
  descricao: string;
  tipo?: string | null;
  valor: string;
  autorizacao?: string;
  parcelas?: VendaConsultaParcela[];
}

export interface VendaConsultaNfce {
  id: number;
  numero: number;
  serie: number;
  status: string;
  chave?: string;
  protocolo?: string;
  tipo_emissao?: string;
  emitida_em?: string | null;
  autorizada_em?: string | null;
  ambiente?: string;
}

export interface VendaConsultaResumo {
  id: number;
  documento: string;
  status: string;
  data_venda: string;
  loja: VendaConsultaLoja | null;
  cliente: VendaConsultaPessoa | null;
  vendedor: VendaConsultaPessoa | null;
  pagamentos: VendaConsultaPagamento[];
  nfce: VendaConsultaNfce | null;
  subtotal: string;
  desconto: string;
  total: string;
}

export interface VendaConsultaPaginada {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: VendaConsultaResumo[];
}

export interface VendaConsultaItem {
  id: number;
  referencia: string;
  ean: string;
  descricao: string;
  cor: string;
  tamanho: string;
  quantidade: number;
  preco_unitario: string;
  desconto: string;
  total_item: string;
  promocao?: string | null;
}

export interface VendaConsultaTotais {
  subtotal: string;
  desconto_itens: string;
  desconto_geral: string;
  total: string;
  valor_recebido: string;
  troco: string;
}

export interface VendaConsultaParcela {
  id: number;
  parcela_n: number;
  parcela_total: number;
  status: string;
  data_vencimento: string | null;
  valor_parcela: string;
  valor_bruto: string;
  taxa_percentual: string;
  taxa_fixa: string;
  valor_taxa: string;
  valor_liquido_previsto: string;
  prazo_pagamento_id: number | null;
  forma_pagamento_id: number | null;
  adquirente_id: number | null;
  condicao_adquirente_id: number | null;
}

export interface VendaConsultaFinanceiro {
  receber: {
    id: number;
    titulo: string;
    documento: string;
    valor_total: string;
  } | null;
  parcelas: VendaConsultaParcela[];
}

export interface VendaConsultaDevolucao {
  id: number;
  documento: string;
  status: string;
  credito_cliente: string;
}

export interface VendaConsultaValeTroca {
  id: number;
  tipo: string;
  valor: string;
  vale: {
    id: number;
    documento: string;
    status: string;
    saldo: string;
  } | null;
}

export interface VendaConsultaCashback {
  id: number;
  tipo: string;
  status: string;
  valor: string;
  validade: string | null;
}

export interface VendaConsultaDetalhe extends VendaConsultaResumo {
  caixa: VendaConsultaCaixa | null;
  operador: VendaConsultaOperador | null;
  itens: VendaConsultaItem[];
  totais: VendaConsultaTotais;
  pagamentos: VendaConsultaPagamento[];
  financeiro: VendaConsultaFinanceiro;
  nfce: VendaConsultaNfce | null;
  devolucoes: VendaConsultaDevolucao[];
  vales_troca: VendaConsultaValeTroca[];
  cashback: {
    gerado: VendaConsultaCashback[];
    usado: VendaConsultaCashback[];
  };
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
  documento?: string;
  local_uuid?: string;
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

export interface RelatorioMargemResumo {
  receita: string;
  cmv: string;
  margem: string;
  margem_percentual: string;
  produtos: number;
  quantidade: number;
}

export interface RelatorioMargemProduto {
  produto: string;
  referencia: string;
  colecao: string;
  grupo: string;
  subgrupo: string;
  quantidade: number;
  receita: string;
  cmv: string;
  margem: string;
  margem_percentual: string;
}

export interface RelatorioMargemLoja {
  loja: string;
  quantidade: number;
  receita: string;
  cmv: string;
  margem: string;
  margem_percentual: string;
}

export interface RelatorioMargem {
  resumo: RelatorioMargemResumo;
  produtos: RelatorioMargemProduto[];
  lojas: RelatorioMargemLoja[];
}
