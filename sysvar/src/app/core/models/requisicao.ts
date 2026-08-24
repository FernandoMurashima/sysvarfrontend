export type RequisicaoPrioridade = 'NORMAL' | 'URGENTE' | 'EMERGENCIAL';
export type RequisicaoStatus = 'RASCUNHO' | 'SOLICITADA' | 'EM_ANALISE' | 'AGUARDANDO_APROVACAO' | 'DEVOLVIDA_CORRECAO' | 'APROVADA' | 'EM_ATENDIMENTO' | 'ATENDIDA_PARCIALMENTE' | 'EM_PROCESSO_COMPRA' | 'EM_PROCESSO_CONTRATACAO' | 'CONCLUIDA' | 'REJEITADA' | 'CANCELADA';
export type RequisicaoItemTipo = 'MATERIAL' | 'SERVICO';
export type RequisicaoItemOrigem = 'PRODUTO' | 'LIVRE' | 'SERVICO';
export type RequisicaoItemStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'EM_SEPARACAO' | 'ATENDIDO' | 'ATENDIDO_PARCIALMENTE' | 'AGUARDANDO_COTACAO' | 'EM_COTACAO' | 'PEDIDO_GERADO' | 'AGUARDANDO_RECEBIMENTO' | 'RECEBIDO' | 'SERVICO_CONTRATACAO' | 'SERVICO_CONCLUIDO' | 'CANCELADO';
export type RequisicaoItemFinalidade = 'USO_CONSUMO' | 'ALMOXARIFADO' | 'IMOBILIZADO' | 'OUTRO';
export type RequisicaoTipo = 'USO_CONSUMO' | 'MANUTENCAO' | 'TI';

export interface RequisicaoServicoCategoria {
  id: number;
  empresa: number;
  nome: string;
  ativo: boolean;
}

export interface RequisicaoSetor {
  id: number;
  empresa: number;
  empresa_nome?: string | null;
  loja: number | null;
  loja_nome?: string | null;
  nome: string;
  descricao?: string;
  ativo: boolean;
  pode_fazer_requisicao: boolean;
  recebe_requisicoes: boolean;
  central_uso_consumo: boolean;
  central_manutencao: boolean;
  central_ti: boolean;
  responsavel_compras: boolean;
  controla_estoque_uso_consumo: boolean;
}

export interface RequisicaoMatrizResponsabilidade {
  id: number;
  empresa: number;
  empresa_nome?: string | null;
  tipo_requisicao: RequisicaoTipo;
  tipo_requisicao_label?: string | null;
  setor_atendimento: number;
  setor_atendimento_nome?: string | null;
  setor_aquisicao: number;
  setor_aquisicao_nome?: string | null;
  ativo: boolean;
}

export interface RequisicaoMaterialCategoria {
  id: number;
  empresa: number;
  empresa_nome?: string | null;
  nome: string;
  descricao?: string;
  ativo: boolean;
}

export interface RequisicaoFinalidadeAquisicao {
  id: number;
  empresa: number;
  empresa_nome?: string | null;
  nome: string;
  descricao?: string;
  ativo: boolean;
  comportamento: RequisicaoItemFinalidade;
}

export interface RequisicaoItem {
  id: number;
  requisicao: number;
  tipo: RequisicaoItemTipo;
  origem: RequisicaoItemOrigem;
  produto: number | null;
  produto_descricao?: string | null;
  produto_referencia?: string | null;
  descricao: string;
  categoria: string;
  categoria_material: number | null;
  categoria_material_nome?: string | null;
  finalidade: RequisicaoItemFinalidade | '';
  finalidade_aquisicao: number | null;
  finalidade_aquisicao_nome?: string | null;
  finalidade_comportamento?: RequisicaoItemFinalidade | null;
  unidade: number | null;
  unidade_descricao?: string | null;
  especificacao_tecnica: string;
  titulo_servico: string;
  descricao_servico: string;
  categoria_servico: number | null;
  categoria_servico_nome?: string | null;
  tipo_servico: string;
  qtd_solicitada: string;
  qtd_atendida: string;
  qtd_pendente: string;
  status: RequisicaoItemStatus;
  observacoes: string;
  indicador_compra?: {
    cor: 'VERMELHO' | 'AMARELO' | 'VERDE' | null;
    codigo: string;
    label: string;
    estoque_atual: string | number | null;
    qtd_pendente_compra: string | number | null;
    cotacoes: { id: number; numero: number; status: string }[];
    pedidos: { id: number; numero: number; status: string }[];
  };
}

export interface RequisicaoHistorico {
  id: number;
  requisicao: number;
  item: number | null;
  usuario: number | null;
  usuario_nome?: string | null;
  data_hora: string;
  acao: string;
  status_anterior: string;
  status_novo: string;
  observacao: string;
}

export interface Requisicao {
  id: number;
  numero: number;
  empresa: number;
  loja: number;
  loja_nome?: string | null;
  setor: number;
  setor_nome?: string | null;
  tipo_requisicao: RequisicaoTipo;
  setor_responsavel: number | null;
  setor_responsavel_nome?: string | null;
  ordem_servico_id?: number | null;
  ordem_servico_status?: string | null;
  requisitante: number;
  requisitante_nome?: string | null;
  data_requisicao: string;
  data_necessaria: string | null;
  prioridade: RequisicaoPrioridade;
  justificativa: string;
  observacoes: string;
  status: RequisicaoStatus;
  itens?: RequisicaoItem[];
  historico?: RequisicaoHistorico[];
}

export interface OrdemServico {
  id: number;
  requisicao: number;
  requisicao_numero?: number | null;
  empresa: number;
  loja: number;
  loja_nome?: string | null;
  setor_solicitante: number;
  setor_solicitante_nome?: string | null;
  setor_responsavel: number;
  setor_responsavel_nome?: string | null;
  tipo: 'MANUTENCAO' | 'TI';
  tipo_label?: string | null;
  origem: string;
  descricao: string;
  status: 'ABERTA' | 'EM_TRIAGEM' | 'EM_ATENDIMENTO' | 'AGUARDANDO_MATERIAL' | 'AGUARDANDO_TERCEIRO' | 'CONCLUIDA' | 'CANCELADA';
  status_label?: string | null;
  responsavel: number | null;
  responsavel_nome?: string | null;
  diagnostico: string;
  solucao: string;
  previsao_atendimento: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  observacoes: string;
  materiais?: OrdemServicoMaterial[];
}

export interface OrdemServicoMaterial {
  id: number;
  ordem_servico: number;
  produto: number | null;
  produto_descricao?: string | null;
  descricao: string;
  unidade: number | null;
  unidade_descricao?: string | null;
  qtd_necessaria: string | number;
  qtd_atendida: string | number;
  qtd_pendente: string | number;
  status: 'PENDENTE' | 'DISPONIVEL' | 'EM_COMPRA' | 'ATENDIDA' | 'CANCELADA';
  status_label?: string | null;
  estoque_disponivel?: string | number;
  observacoes: string;
}

export interface Paginated<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}
