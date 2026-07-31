export interface NotaFiscalSaidaItem {
  id: number;
  nota: number;
  produto: number;
  produto_descricao?: string;
  sku: number;
  sku_ean?: string;
  ean: string;
  referencia: string;
  descricao: string;
  cor: string;
  tamanho: string;
  ncm: string;
  cfop: string;
  quantidade: number | string;
  valor_unitario: number | string;
  valor_desconto: number | string;
  valor_total: number | string;
}

export interface NotaFiscalSaida {
  id: number;
  empresa: number;
  loja_origem: number;
  loja_origem_nome?: string;
  loja_destino?: number | null;
  loja_destino_nome?: string;
  tipo_operacao: string;
  modelo: string;
  serie: string;
  numero: string;
  documento_origem: string;
  chave_acesso: string;
  protocolo_autorizacao: string;
  xml: string;
  cfop: string;
  natureza_operacao: string;
  status: 'DI' | 'PR' | 'AU' | 'CA';
  dt_emissao: string;
  dt_saida: string;
  valor_produtos: number | string;
  valor_desconto: number | string;
  valor_frete: number | string;
  valor_total: number | string;
  observacoes: string;
  autorizada_em?: string | null;
  itens?: NotaFiscalSaidaItem[];
}
