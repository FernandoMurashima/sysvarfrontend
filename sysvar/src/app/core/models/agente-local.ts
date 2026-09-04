export interface CodigoAtivacaoAgenteLocal {
  codigo: string;
  expira_em: string;
  empresa: number;
}

export interface AgenteLocalSysvar {
  id: number;
  empresa: number;
  identificador: string;
  nome: string;
  ativo: boolean;
  ultimo_contato?: string | null;
  versao?: string;
  hostname?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface ConfiguracaoXmlFornecedor {
  id: number;
  empresa: number;
  loja: number | null;
  loja_nome?: string | null;
  caminho_local: string;
  ativo: boolean;
  identificador_agente: string;
  criado_em?: string;
  atualizado_em?: string;
}

export type ConfiguracaoXmlFornecedorPayload = Pick<
  ConfiguracaoXmlFornecedor,
  'empresa' | 'loja' | 'caminho_local' | 'ativo' | 'identificador_agente'
>;
