export type HubSincronizacaoStatus = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDA' | 'ERRO' | '';
export type HubSincronizacaoStatusVisual = 'VERDE' | 'AMARELO' | 'VERMELHO';
export type HubAtivacaoEstado = 'PENDENTE' | 'UTILIZADA' | 'EXPIRADA' | 'REVOGADA';

export interface HubAtivacaoAdmin {
  id: number;
  loja_id: number;
  loja_nome: string;
  empresa_id: number;
  codigo_prefixo: string;
  criada_em: string;
  expira_em: string;
  estado: HubAtivacaoEstado;
  hub_id: number | null;
}

export interface HubAtivacaoCriada extends HubAtivacaoAdmin {
  codigo: string;
  empresa_nome?: string;
}

export interface HubSincronizacaoLoja {
  loja_id: number;
  loja_nome: string;
  empresa_id: number;
  hub_id: number | null;
  hub_uuid: string | null;
  hub_nome?: string;
  hub_ativo: boolean;
  possui_credencial: boolean;
  hostname: string;
  versao: string;
  ultimo_ip: string | null;
  ultimo_contato: string | null;
  snapshot_operacional: HubSnapshotOperacional | null;
  snapshot_operacional_em: string | null;
  sincronizacao_id: number | null;
  sincronizacao_status: HubSincronizacaoStatus;
  solicitado_em: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  etapa_atual: string;
  mensagem_erro: string;
  status_visual: HubSincronizacaoStatusVisual;
  ativacao_pendente?: HubAtivacaoAdmin | null;
  caixas?: HubCaixaOpcao[];
  hub_estado?: string;
  configuracao_estado?: string;
  pareamento_estado?: string;
  total_terminais?: number;
  terminais_ativos?: number;
  terminais_pareados?: number;
  comando_administrativo_ativo?: HubComandoAdministrativo | null;
  ultimo_comando_configuracao?: HubComandoAdministrativo | null;
  ultimo_comando_pareamento?: HubComandoAdministrativo | null;
}

export interface HubCaixaOpcao {
  id: number;
  codigo: string;
  descricao: string;
  ativo: boolean;
}

export interface HubComandoAdministrativo {
  id: number;
  tipo: 'CONFIGURAR_TERMINAL' | 'GERAR_PAREAMENTO';
  payload: Record<string, any>;
  resultado: Record<string, any>;
  status: 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO';
  mensagem_erro: string;
  solicitado_em: string;
  iniciado_em: string | null;
  concluido_em: string | null;
  atualizado_em: string;
}

export interface HubSnapshotOperacional {
  gerado_em: string | null;
  terminais: HubTerminalOperacional[];
}

export interface HubTerminalOperacional {
  terminal_uuid: string | null;
  codigo: string;
  nome: string;
  ativo: boolean;
  pareado: boolean;
  pareado_em: string | null;
  hostname: string | null;
  ultimo_ip: string | null;
  ultima_conexao_em: string | null;
  online: boolean;
  caixa: HubCaixaOperacional | null;
  caixa_status: 'ABERTO' | 'FECHADO' | 'SEM_CAIXA' | 'CAIXA_NAO_ENCONTRADO' | string;
  sessao_caixa: HubSessaoCaixaOperacional | null;
}

export interface HubCaixaOperacional {
  id: number | null;
  codigo: string;
  descricao: string;
  ativo: boolean;
}

export interface HubSessaoCaixaOperacional {
  uuid: string | null;
  status: string;
  aberto_em: string | null;
  operador: HubIdentificacaoOperacional | null;
  terminal_abertura: HubIdentificacaoOperacional | null;
}

export interface HubIdentificacaoOperacional {
  codigo: string;
  nome: string;
}

export interface HubSincronizacaoSolicitacao {
  id: number;
  hub_id: number;
  tipo: 'COMPLETA';
  status: Exclude<HubSincronizacaoStatus, ''>;
  solicitado_em: string;
  iniciado_em: string | null;
  concluido_em: string | null;
  etapa_atual: string;
  mensagem_erro: string;
  atualizado_em: string;
}

export interface HubSincronizacaoTodasResultado {
  criadas: number;
  ja_pendentes: number;
  ignoradas_sem_hub: number;
  ignoradas_inativas: number;
  solicitacoes: HubSincronizacaoSolicitacao[];
}

export interface HubAdministracaoAcaoResultado {
  hub_id: number;
  loja_id: number;
  empresa_id: number;
  ativo: boolean;
  possui_credencial: boolean;
}

export interface HubConfigurarTerminalPayload {
  codigo: string;
  nome: string;
  caixa_retaguarda_id: number | null;
  hostname?: string;
}
