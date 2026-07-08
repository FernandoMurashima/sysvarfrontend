export interface ConsultaNaturezaTotais {
  receitas: string;
  despesas: string;
  transferencias: string;
  resultado: string;
  movimentacoes: number;
}

export interface ConsultaNaturezaLinha {
  natureza_id?: number;
  codigo?: string;
  descricao?: string;
  operacao?: string;
  categoria_gerencial?: string;
  receitas: string;
  despesas: string;
  transferencias: string;
  resultado: string;
  quantidade: number;
}

export interface ConsultaNaturezaCategoria {
  categoria_gerencial: string;
  receitas: string;
  despesas: string;
  transferencias: string;
  resultado: string;
  quantidade: number;
}

export interface ConsultaNaturezaDetalhe {
  id: number;
  data_movimento: string;
  loja: string;
  documento: string;
  historico: string;
  tipo: string;
  status: string;
  origem: string;
  natureza: string;
  categoria_gerencial: string;
  valor: string;
  receita: string;
  despesa: string;
  transferencia: string;
}

export interface ConsultaFinanceiraNatureza {
  periodo: {
    data_ini: string;
    data_fim: string;
  };
  totais: ConsultaNaturezaTotais;
  por_natureza: ConsultaNaturezaLinha[];
  por_categoria: ConsultaNaturezaCategoria[];
  detalhes: ConsultaNaturezaDetalhe[];
}
