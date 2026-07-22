# Migracao do Padrao de Cadastros

Referencia oficial: tela `Cadastro de Lojas`.

Status possiveis:

- NAO INICIADO
- EM ANALISE
- EM IMPLEMENTACAO
- CONCLUIDO
- BLOQUEADO
- NAO SE APLICA

## Inventario inicial

| Modulo | Cadastro/Tela | Rota | Componente | Service | Listagem | Formulario | Pesquisa/Filtros | Paginacao | Acoes | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Cadastros | Empresas | `/empresas` | `empresas` | `empresas.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Inativar/Excluir | NAO INICIADO |
| Cadastros | Lojas | `/lojas` | `lojas` | `lojas.service.ts` | Sim | Sim | Sim | Sim | Menu padrao | CONCLUIDO |
| Cadastros | Clientes | `/clientes` | `clientes` | `clientes.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Cadastros | Fornecedores | `/fornecedores` | `fornecedores` | `fornecedores.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Cadastros | Funcionarios | `/funcionarios` | `funcionarios` | `funcionarios.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Cadastros | Naturezas de lancamento | `/natureza` | `natureza-lancamento` | `natureza-lancamento.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Cadastros | Plano contabil | `/plano-contabil` | `plano-contabil` | `plano-contabil.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Produtos | Cores | `/cores` | `cores` | `cores.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Produtos | Colecoes | `/colecoes` | `colecoes` | `colecoes.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Produtos | Unidades | `/unidades` | `unidades` | `unidades.service.ts` | Sim | Sim | Sim | Sim | Menu padrao | CONCLUIDO |
| Produtos | Grupos/Subgrupos | `/grupos` | `grupos` | `grupos.service.ts` / `subgrupos.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Produtos | Grades/Tamanhos | `/grades` | `Grade` | `grades.service.ts` / `tamanhos.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Produtos | Packs | `/packs` | `Pack` | `pack.service.ts` / `pack-item.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Produtos | Produtos de revenda | `/produtos` | `Produtos` | `produtos.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Inativar/Bloquear/Excluir | NAO INICIADO |
| Produtos | Produtos uso/consumo | `/produtos-uso` | `produtos-uso` | `produtos.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Inativar/Bloquear/Excluir | NAO INICIADO |
| Fiscal | NCM | `/fiscal/ncm` | `Ncms` | `ncms.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Fiscal | CFOP | `/fiscal/cfop` | `cfops` | `cfops.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Fiscal | Tributos | `/fiscal/tributos` | `tributos` | `tributos.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Fiscal | Regras tributarias | `/fiscal/regras-tributarias` | `regras-tributarias` | `regras-tributarias.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Fiscal | Materiais | `/material` | `material` | `material.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Configuracoes | Usuarios | `/config/usuarios` | `usuarios` | `users.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |
| Configuracoes | Formas de pagamento | `/financeiro/formas-pagamento` | `formas-pagamento` | `formas-pagamento.service.ts` | Sim | Sim | Sim | Sim | Consultar/Editar/Excluir | NAO INICIADO |

## Ordem de migracao

1. Etapa 1: Unidades, Cores, Colecoes, Grupos/Subgrupos, Grades/Tamanhos, NCM.
2. Etapa 2: Clientes, Fornecedores, Funcionarios, Formas de pagamento, Packs.
3. Etapa 3: Produtos, Empresas, Usuarios, Fiscal avancado.

## Acompanhamento

| Data | Tela | Alteracao | Teste | Status |
|---|---|---|---|---|
| 2026-07-18 | Lojas | Padrao oficial criado | TypeScript OK | CONCLUIDO |
| 2026-07-18 | Unidades | Migrada para o padrao oficial de Lojas | TypeScript OK | CONCLUIDO |
