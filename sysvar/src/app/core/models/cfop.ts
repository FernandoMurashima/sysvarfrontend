export interface Cfop {
  id?: number;
  empresa?: number;
  codigo: string;
  descricao: string;
  tipo_operacao: 'VENDA' | 'COMPRA' | 'DEVOLUCAO' | 'TRANSFERENCIA' | 'OUTROS' | string;
  destino: 'DENTRO_UF' | 'FORA_UF' | 'AMBOS' | string;
  movimenta_estoque: boolean;
  gera_financeiro: boolean;
  ativo: boolean;
  observacoes?: string | null;
}
