import { FinalizarVendaPdvPayload, VendaPdv } from '../models/venda-pdv';

export type PdvRuntime = 'browser' | 'desktop';
export type PdvConnectionStatus = 'online' | 'offline';
export type PdvSyncStatus = 'idle' | 'running' | 'error';

export interface PdvDesktopStatus {
  runtime: PdvRuntime;
  online: boolean;
  apiReachable: boolean;
  terminalId?: string;
  terminalAtivo?: boolean;
  lojaId?: number;
  caixaId?: number;
  terminal?: PdvTerminalConfig | null;
  pendencias?: number;
  resumoLocal?: PdvStatusLocal | null;
  atualizadoEm?: string;
}

export interface PdvStatusLocal {
  vendasPendentes: number;
  documentosFiscaisPendentes: number;
  movimentosEstoquePendentes: number;
  errosSincronizacao: number;
}

export interface PdvProdutoLocal {
  produtoId: number;
  skuId: number;
  descricao: string;
  referencia: string;
  ean: string;
  cor: string;
  tamanho: string;
  preco: number;
  estoque: number;
  imagemUrl?: string;
}

export interface PdvCatalogoResultado {
  total: number;
  atualizadoEm: string;
}

export interface PdvVendaLocalResultado {
  localUuid: string;
  documento: string;
  status: 'PENDENTE_SYNC' | 'SINCRONIZADA';
  venda?: VendaPdv;
}

export interface PdvVendaEmAndamento {
  localUuid: string;
  numeroDocumento: string;
  updatedAt: string;
}

export interface PdvSyncResumo {
  status: PdvSyncStatus;
  pendentes: number;
  enviados: number;
  erros: number;
  ultimaSincronizacao?: string;
  mensagem?: string;
  resumoLocal?: PdvStatusLocal | null;
}

export interface PdvSyncContexto {
  apiBaseUrl: string;
  token: string;
}

export interface PdvTerminalConfigInput {
  empresaId?: number | null;
  lojaId?: number | null;
  caixaId?: number | null;
  usuarioId?: number | null;
  apiBaseUrl: string;
}

export interface PdvTerminalConfig {
  terminalUuid: string;
  empresaId?: number | null;
  lojaId?: number | null;
  caixaId?: number | null;
  usuarioId?: number | null;
  apiBaseUrl: string;
  ativo: boolean;
  updatedAt: string;
}

export interface SysvarPdvApi {
  status(): Promise<PdvDesktopStatus>;
  ping(): Promise<boolean>;
  terminal: {
    configurar(config: PdvTerminalConfigInput): Promise<PdvTerminalConfig>;
  };
  produtos: {
    pesquisar(termo: string): Promise<PdvProdutoLocal[]>;
    atualizarCatalogo(produtos: PdvProdutoLocal[]): Promise<PdvCatalogoResultado>;
  };
  vendas: {
    finalizar(payload: FinalizarVendaPdvPayload): Promise<PdvVendaLocalResultado>;
    emAndamento(): Promise<PdvVendaEmAndamento[]>;
  };
  sincronizacao: {
    status(): Promise<PdvSyncResumo>;
    executar(contexto: PdvSyncContexto): Promise<PdvSyncResumo>;
  };
}

declare global {
  interface Window {
    sysvarPdv?: SysvarPdvApi;
  }
}
