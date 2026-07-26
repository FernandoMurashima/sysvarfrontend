import { contextBridge, ipcRenderer } from 'electron';

const channels = {
  status: 'sysvar:status',
  ping: 'sysvar:ping',
  produtosPesquisar: 'sysvar:produtos:pesquisar',
  produtosAtualizarCatalogo: 'sysvar:produtos:atualizar-catalogo',
  terminalConfigurar: 'sysvar:terminal:configurar',
  vendaFinalizar: 'sysvar:vendas:finalizar',
  vendasEmAndamento: 'sysvar:vendas:em-andamento',
  caixaLocalObter: 'sysvar:caixa-local:obter',
  caixaLocalAbrir: 'sysvar:caixa-local:abrir',
  caixaLocalFechar: 'sysvar:caixa-local:fechar',
  syncStatus: 'sysvar:sync:status',
  syncExecutar: 'sysvar:sync:executar'
};

export function exposeSysvarPdvApi(): void {
  contextBridge.exposeInMainWorld('sysvarPdv', {
    status: () => ipcRenderer.invoke(channels.status),
    ping: () => ipcRenderer.invoke(channels.ping),
    terminal: {
      configurar: (config: unknown) => ipcRenderer.invoke(channels.terminalConfigurar, config)
    },
    produtos: {
      pesquisar: (termo: string) => ipcRenderer.invoke(channels.produtosPesquisar, String(termo ?? '')),
      atualizarCatalogo: (produtos: unknown[]) => ipcRenderer.invoke(channels.produtosAtualizarCatalogo, produtos)
    },
    vendas: {
      finalizar: (payload: unknown) => ipcRenderer.invoke(channels.vendaFinalizar, payload),
      emAndamento: () => ipcRenderer.invoke(channels.vendasEmAndamento)
    },
    caixaLocal: {
      obter: (lojaId: number, caixaId: number) => ipcRenderer.invoke(channels.caixaLocalObter, lojaId, caixaId),
      abrir: (payload: unknown) => ipcRenderer.invoke(channels.caixaLocalAbrir, payload),
      fechar: (payload: unknown) => ipcRenderer.invoke(channels.caixaLocalFechar, payload)
    },
    sincronizacao: {
      status: () => ipcRenderer.invoke(channels.syncStatus),
      executar: (contexto: unknown) => ipcRenderer.invoke(channels.syncExecutar, contexto)
    }
  });
}
