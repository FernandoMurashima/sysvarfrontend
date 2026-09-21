export type HubSincronizacaoStatus = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDA' | 'ERRO' | '';
export type HubSincronizacaoStatusVisual = 'VERDE' | 'AMARELO' | 'VERMELHO';

export interface HubSincronizacaoLoja {
  loja_id: number;
  loja_nome: string;
  empresa_id: number;
  hub_id: number | null;
  hub_uuid: string | null;
  hub_ativo: boolean;
  hostname: string;
  versao: string;
  ultimo_ip: string | null;
  ultimo_contato: string | null;
  sincronizacao_id: number | null;
  sincronizacao_status: HubSincronizacaoStatus;
  solicitado_em: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  etapa_atual: string;
  mensagem_erro: string;
  status_visual: HubSincronizacaoStatusVisual;
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
