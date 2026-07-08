export interface DreTotais {
  receita_bruta: string;
  deducoes: string;
  receita_liquida: string;
  custos: string;
  lucro_bruto: string;
  despesas_vendas: string;
  despesas_administrativas: string;
  despesas_financeiras: string;
  tributos: string;
  despesas: string;
  outros: string;
  resultado: string;
  movimentacoes: number;
}

export interface DreLinha {
  natureza_id: number;
  codigo: string;
  descricao: string;
  categoria_gerencial: string;
  valor: string;
  quantidade: number;
}

export interface DreGrupo {
  codigo: string;
  grupo: string;
  valor: string;
  linhas: DreLinha[];
}

export interface DreDetalhe {
  id: number;
  data_movimento: string;
  loja: string;
  documento: string;
  historico: string;
  origem: string;
  grupo: string;
  natureza: string;
  categoria_gerencial: string;
  valor: string;
}

export interface DreGerencial {
  periodo: {
    data_ini: string;
    data_fim: string;
  };
  totais: DreTotais;
  grupos: DreGrupo[];
  detalhes: DreDetalhe[];
}
