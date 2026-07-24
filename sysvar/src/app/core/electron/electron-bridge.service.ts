import { Injectable } from '@angular/core';

import {
  PdvDesktopStatus,
  PdvCatalogoResultado,
  PdvProdutoLocal,
  PdvSyncContexto,
  PdvSyncResumo,
  PdvTerminalConfig,
  PdvTerminalConfigInput,
  PdvVendaEmAndamento,
  PdvVendaLocalResultado,
  SysvarPdvApi
} from './sysvar-pdv-api';
import { FinalizarVendaPdvPayload } from '../models/venda-pdv';

@Injectable({ providedIn: 'root' })
export class ElectronBridgeService {
  get isDesktop(): boolean {
    return typeof window !== 'undefined' && !!window.sysvarPdv;
  }

  get api(): SysvarPdvApi | null {
    return this.isDesktop ? window.sysvarPdv ?? null : null;
  }

  status(): Promise<PdvDesktopStatus> {
    if (!this.api) {
      return Promise.resolve({
        runtime: 'browser',
        online: typeof navigator === 'undefined' ? true : navigator.onLine,
        apiReachable: true,
        pendencias: 0
      });
    }
    return this.api.status();
  }

  pesquisarProdutos(termo: string): Promise<PdvProdutoLocal[]> {
    return this.api?.produtos.pesquisar(termo) ?? Promise.resolve([]);
  }

  atualizarCatalogo(produtos: PdvProdutoLocal[]): Promise<PdvCatalogoResultado | null> {
    return this.api?.produtos.atualizarCatalogo(produtos) ?? Promise.resolve(null);
  }

  configurarTerminal(config: PdvTerminalConfigInput): Promise<PdvTerminalConfig | null> {
    return this.api?.terminal.configurar(config) ?? Promise.resolve(null);
  }

  finalizarVenda(payload: FinalizarVendaPdvPayload): Promise<PdvVendaLocalResultado | null> {
    return this.api?.vendas.finalizar(payload) ?? Promise.resolve(null);
  }

  vendasEmAndamento(): Promise<PdvVendaEmAndamento[]> {
    return this.api?.vendas.emAndamento() ?? Promise.resolve([]);
  }

  statusSincronizacao(): Promise<PdvSyncResumo> {
    return this.api?.sincronizacao.status() ?? Promise.resolve({ status: 'idle', pendentes: 0, enviados: 0, erros: 0 });
  }

  sincronizar(contexto: PdvSyncContexto): Promise<PdvSyncResumo> {
    return this.api?.sincronizacao.executar(contexto) ?? this.statusSincronizacao();
  }
}
