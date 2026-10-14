# AGENTS.md — Sysvar Central Frontend

Frontend Angular 17 da retaguarda Central do Sysvar. Consome a API do `sysvarbackend`. A aplicação fica em `sysvar/`; rode os comandos a partir dessa pasta.

Não duplicar aqui a interface operacional da loja: PDV e operação local pertencem ao `sysvarhub-frontend`.

## Estrutura

- Código: `sysvar/src/app/` (features, services, guards). Assets: `sysvar/src/assets/`. Ambientes: `sysvar/src/environments/`.
- Convenções Angular CLI: `*.component.ts`, `*.service.ts`, `*.guard.ts`; specs `*.spec.ts` ao lado do código.
- Siga o `.editorconfig`: UTF-8, 2 espaços, aspas simples em TypeScript.

## Comandos (em `sysvar/`)

```text
npx.cmd tsc -p tsconfig.app.json --noEmit
npx.cmd ng build --configuration development
npm.cmd test -- --watch=false --browsers=ChromeHeadless
npm start
```

Para testes direcionados, use `--include=src/app/.../arquivo.spec.ts` quando aplicável. Caso o ChromeHeadless não esteja disponível, reporte a limitação; não altere a configuração global de testes só para contorná-la.

## Cuidados deste repositório

- Regra de negócio fica no backend; o frontend apresenta, antecipa validação e consome a API.
- Ajuste visual não vira redesign: preserve comportamento e regras.
- Siga os padrões visuais das telas existentes do mesmo módulo.

## Documentação oficial do Sysvar

A documentação oficial (regras de negócio, decisões, riscos, homologações) fica no cofre:

- local: `C:\Takeshi\takeshi\10 Projetos\Sysvar`
- repositório: `FernandoMurashima/sysvar-vault` (`main`)

A skill `sysvar-contexto` centraliza o procedimento detalhado de recuperação das fontes do projeto; não duplique seu roteiro neste arquivo.

Antes de alterar código:

1. Use a skill `sysvar-contexto`, se estiver instalada e disponível, para localizar as fontes vigentes do módulo.
2. Se indisponível, consulte no cofre somente os documentos pertinentes e existentes; não crie documentos ausentes para completar um padrão.
3. Leia o código atual relacionado antes de criar qualquer coisa.

Não leia as notas gerais grandes (`Sysvar.md`, `Riscos e Cuidados.md`, `Mapa Técnico.md`) inteiras: busque nelas o trecho do módulo.

## Regras de trabalho

- **Pré-verificação:** antes de alterar, confira branch, HEAD e `git status --short`. Preserve alterações preexistentes; nunca sobrescreva trabalho alheio.
- **Tarefa somente de análise:** auditorias, levantamentos e diagnósticos não autorizam editar arquivos, criar commits ou fazer push.
- **Reaproveitar → refatorar → estender → criar.** Não construa do zero o que já existe. Antes de criar model, endpoint, serializer, service, componente ou helper, procure um equivalente.
- **Não invente regra de negócio.** Se houver dúvida que o prompt, a documentação e o código não resolvem, preserve o comportamento atual e registre a dúvida no relatório final.
- **Hierarquia de fontes:** decisão aprovada no prompt > documentação vigente > código atual > inferência. Seções datadas e checkpoints são histórico.
- **Escopo fechado.** Altere só o que a tarefa pede. Correção pequena não vira refatoração.
- **Backend é a autoridade** de validações, cálculos e permissões. O frontend pode antecipar, nunca substituir.
- **Multiempresa:** todo acesso a dados respeita tenant, empresa e loja no backend.
- **Testes proporcionais ao escopo**, incluindo o caso negativo da regra alterada. Execute testes direcionados por padrão; suíte completa somente se a abrangência da mudança justificar ou a tarefa solicitar. Proibido: `skip` sem necessidade, comentar teste, enfraquecer assert, mudar regra aprovada para o teste passar.
- **Segredos:** não versionar nem copiar `.env`, tokens, XML de cliente, dumps, logs ou filas SQLite.

## Encerramento de toda tarefa

1. Em tarefas com alterações autorizadas, executar somente os testes, verificações e builds pertinentes; não rodar a suíte completa por padrão. Em auditorias e diagnósticos, não executar validações invasivas sem solicitação.
2. Somente quando a tarefa autorizar modificações e versionamento: revisar o diff, executar `git add` apenas dos arquivos intencionais, criar `git commit` com resumo curto, imperativo, em português (ex.: `Ajusta validacao visual de vendas na Central`) e executar `git push origin main` se autorizado. Nunca incluir modificações preexistentes não relacionadas.
3. Sem mensagens intermediárias. Entregar um único relatório final com: resumo; documentação consultada; código reaproveitado; arquivos alterados; migrations; testes e builds pertinentes (ou motivo da não execução); SHA e confirmação do push quando houver; `git status` final; pendências reais e dúvidas de negócio. Em tarefas somente de leitura, informar expressamente que não houve alterações nem commit/push.
