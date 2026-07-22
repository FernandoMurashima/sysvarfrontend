import { contextBridge, ipcRenderer } from 'electron';

const channels = {
  status: 'sysvar:status',
  ping: 'sysvar:ping',
  produtosPesquisar: 'sysvar:produtos:pesquisar',
  vendaFinalizar: 'sysvar:vendas:finalizar',
  syncStatus: 'sysvar:sync:status',
  syncExecutar: 'sysvar:sync:executar'
};

export function exposeSysvarPdvApi(): void {
  contextBridge.exposeInMainWorld('sysvarPdv', {
    status: () => ipcRenderer.invoke(channels.status),
    ping: () => ipcRenderer.invoke(channels.ping),
    produtos: {
      pesquisar: (termo: string) => ipcRenderer.invoke(channels.produtosPesquisar, String(termo ?? ''))
    },
    vendas: {
      finalizar: (payload: unknown) => ipcRenderer.invoke(channels.vendaFinalizar, payload)
    },
    sincronizacao: {
      status: () => ipcRenderer.invoke(channels.syncStatus),
      executar: () => ipcRenderer.invoke(channels.syncExecutar)
    }
  });
}

