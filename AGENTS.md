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
npm test
npm start
```

## Cuidados deste repositório

- Regra de negócio fica no backend; o frontend apresenta, antecipa validação e consome a API.
- Ajuste visual não vira redesign: preserve comportamento e regras.
- Siga os padrões visuais das telas existentes do mesmo módulo.

## Documentação oficial do Sysvar

A documentação oficial (regras de negócio, decisões, riscos, homologações) fica no cofre:

- local: `C:\Takeshi\takeshi\10 Projetos\Sysvar`
- repositório: `FernandoMurashima/sysvar-vault` (`main`)

Antes de alterar código:

1. Se a skill `sysvar-contexto` estiver disponível, use-a para montar o contexto do módulo.
2. Se não estiver, leia em `Contexto do Projeto/`, para o módulo da tarefa: `Estado Atual - <Área>`, `Workflows - <Área> - <Submódulo>` e `Riscos e Cuidados - <Área> - <Submódulo>`. Em `Homologações/`, leia a homologação do módulo quando existir.
3. Leia o código atual relacionado antes de criar qualquer coisa.

Não leia as notas gerais grandes (`Sysvar.md`, `Riscos e Cuidados.md`, `Mapa Técnico.md`) inteiras: busque nelas o trecho do módulo.

## Regras de trabalho

- **Reaproveitar → refatorar → estender → criar.** Não construa do zero o que já existe. Antes de criar model, endpoint, serializer, service, componente ou helper, procure um equivalente.
- **Não invente regra de negócio.** Se houver dúvida que o prompt, a documentação e o código não resolvem, preserve o comportamento atual e registre a dúvida no relatório final.
- **Hierarquia de fontes:** decisão aprovada no prompt > documentação vigente > código atual > inferência. Seções datadas e checkpoints são histórico.
- **Escopo fechado.** Altere só o que a tarefa pede. Correção pequena não vira refatoração.
- **Backend é a autoridade** de validações, cálculos e permissões. O frontend pode antecipar, nunca substituir.
- **Multiempresa:** todo acesso a dados respeita tenant, empresa e loja no backend.
- **Testes proporcionais ao escopo**, incluindo o caso negativo da regra alterada. Proibido: `skip` sem necessidade, comentar teste, enfraquecer assert, mudar regra aprovada para o teste passar.
- **Segredos:** não versionar nem copiar `.env`, tokens, XML de cliente, dumps, logs ou filas SQLite.

## Encerramento de toda tarefa

1. Rodar os testes e o build relevantes (seção Comandos acima).
2. `git add` só dos arquivos alterados intencionalmente; `git commit` com resumo curto, imperativo, em português (ex.: `Corrige escopo multiempresa da devolucao Hub`); `git push origin main`.
3. Sem mensagens intermediárias. Entregar um único relatório final com: resumo; documentação consultada; código reaproveitado; arquivos alterados; migrations; testes e builds com resultado; commit SHA; confirmação do push; pendências reais e dúvidas de negócio.
