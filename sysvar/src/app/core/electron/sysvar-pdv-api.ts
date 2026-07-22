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
  pendencias?: number;
  atualizadoEm?: string;
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

export interface PdvVendaLocalResultado {
  localUuid: string;
  documento: string;
  status: 'PENDENTE_SYNC' | 'SINCRONIZADA';
  venda?: VendaPdv;
}

export interface PdvSyncResumo {
  status: PdvSyncStatus;
  pendentes: number;
  enviados: number;
  erros: number;
  ultimaSincronizacao?: string;
  mensagem?: string;
}

export interface SysvarPdvApi {
  status(): Promise<PdvDesktopStatus>;
  ping(): Promise<boolean>;
  produtos: {
    pesquisar(termo: string): Promise<PdvProdutoLocal[]>;
  };
  vendas: {
    finalizar(payload: FinalizarVendaPdvPayload): Promise<PdvVendaLocalResultado>;
  };
  sincronizacao: {
    status(): Promise<PdvSyncResumo>;
    executar(): Promise<PdvSyncResumo>;
  };
}

declare global {
  interface Window {
    sysvarPdv?: SysvarPdvApi;
  }
}

