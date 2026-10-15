# PDV Desktop - Fase 1 — DESCONTINUADO

**Status: DESCONTINUADO em 15/10/2026. O PDV oficial é o Sysvar Hub.**

Os dois PDVs antigos da Central foram removidos. As URLs `/vendas/pdv`,
`/vendas/pdv-desktop` e `/loja/pdv-offline` redirecionam para `/home`.
Consulta de Vendas, Devoluções, Recebimento, Estoque, Financeiro e administração
da sincronização Hub continuam disponíveis na Central.

### Dependências e dados históricos preservados

- `VendaPdvService` e os modelos de venda continuam usados por Consulta de Vendas e Devoluções.
- `PdvConnectivityService`, `ElectronBridgeService`, seus contratos e
  `PdvOfflineDevolucaoQueueService` continuam necessários às Devoluções.
- `PdvOfflineQueueService`, `PdvOfflineCatalogService`, `PdvLocalCaixaService` e
  `PdvLocalAuditoriaService` foram mantidos para tratamento separado dos registros
  legados. Nenhuma rota de PDV da Central os disponibiliza para novas operações.
- Não remover automaticamente chaves de localStorage, dados SQLite, auditorias,
  caixas ou filas existentes. Não há migração nem reprocessamento nesta alteração.
- **Pendência separada:** definir procedimento de identificação e tratamento de
  eventuais vendas pendentes e históricos do antigo PDV, antes de remover seus
  adaptadores de persistência. A existência de pendências operacionais não foi consultada.

---

O conteúdo abaixo é registro histórico do protótipo descontinuado; não é roteiro
de operação ou homologação do PDV oficial do Hub.


## Entregue nesta fase

- Contrato Angular `window.sysvarPdv` para diferenciar browser e desktop.
- Servico Angular `ElectronBridgeService` para chamar o PDV local quando existir.
- Servico `PdvConnectivityService` para status online/offline.
- Estrutura Electron segura com `contextIsolation`, `nodeIntegration: false` e preload controlado.
- Estrutura SQLite local com migrations para terminal, cache de produtos, vendas pendentes, fila de sync e auditoria.
- Repositorios iniciais para cache de produtos e venda local.
- Base de sincronizacao com idempotencia por `local_uuid`.

## Ainda nao ativado

- Dependencias Electron e SQLite no `package.json`.
- Tela escura nova do PDV.
- Sincronizacao real com o backend.
- Endpoint backend de ativacao de terminal.
- Emissao NFC-e offline em contingencia.

## Proxima fase segura

1. Criar os endpoints backend de terminal, carga inicial e sincronizacao.
2. Adicionar campos de idempotencia nas vendas do backend.
3. Instalar Electron e SQLite.
4. Criar a tela desktop escura sem substituir o PDV web.
5. Ativar fluxo: online finaliza no backend, offline grava local e sincroniza depois.

