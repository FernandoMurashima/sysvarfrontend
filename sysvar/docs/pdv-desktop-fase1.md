# PDV Desktop - Fase 1

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

