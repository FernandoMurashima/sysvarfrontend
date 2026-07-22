# Politica IPC do PDV Desktop

- O renderer nao acessa Node.js diretamente.
- O preload expõe somente `window.sysvarPdv`.
- Operacoes de arquivo, banco local e sincronizacao ficam no processo main.
- Toda venda offline deve usar `local_uuid` como chave de idempotencia.
- Toda venda pendente deve permanecer na fila ate confirmacao do backend.

