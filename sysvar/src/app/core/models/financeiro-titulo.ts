export type TipoTituloFinanceiro = 'pagar' | 'receber';
export type StatusParcela = 'PREVISTO' | 'EFETIVO' | 'BAIXADO' | 'CANCELADO';

export interface ParcelaFinanceira {
  Idpagaritem?: number;
  Idreceberitem?: number;
  Idpagar?: number;
  Idreceber?: number;
  parcela_n: number;
  status: StatusParcela;
  Data_vencimento: string;
  valor_parcela: string | number;
  FormaPagamento?: string | null;
  idconta?: number | null;
  juros?: string | number;
  desconto?: string | number;
  data_baixa?: string | null;
  valor_baixa?: string | number | null;
  Previsao?: boolean;
  Idnatureza?: number | null;
  data_cadastro?: string;
}

export interface TituloFinanceiro {
  Idpagar?: number;
  Idreceber?: number;
  idloja: number;
  idfornecedor?: number;
  idcliente?: number;
  Titulo: string;
  Documento?: string | null;
  Data_emissao: string;
  Valor_total: string | number;
  Previsao: boolean;
  FormaPagamento?: string | null;
  Idnatureza: number;
  conta_contabil?: string | null;
  pedido_compra?: number | null;
  pedido_venda?: number | null;
  nfe_id?: number | null;
  data_cadastro?: string;
  itens?: ParcelaFinanceira[];
}
