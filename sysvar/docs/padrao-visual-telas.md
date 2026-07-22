# Padrao Visual Sysvar para Telas de Cadastro e Consulta

Este documento define o padrao criado a partir da modernizacao da tela de Lojas. Ele deve ser usado como base para telas de cadastro, consulta, financeiro, estoque, compras, vendas e configuracoes.

## Estrutura da pagina

1. Cabecalho da pagina com titulo, subtitulo e acao principal.
2. Mensagens de sucesso ou erro logo abaixo do cabecalho.
3. Cards de indicadores quando a tela tiver resumo gerencial.
4. Painel de filtros com busca principal, filtros rapidos e acoes alinhadas.
5. Formulario embutido somente quando estiver cadastrando, editando ou consultando.
6. Tabela principal com acoes por linha em menu compacto.
7. Paginacao padronizada no rodape da tabela.
8. Modais padronizados para confirmacoes e detalhes.

## Componentes compartilhados

- `app-page-header`: titulo, subtitulo e botao principal da tela.
- `app-summary-card`: cards de indicadores.
- `app-status-badge`: status, tipo e marcadores visuais.
- `app-row-actions-menu`: menu de acoes por registro.
- `app-list-pagination`: paginacao com seletor de itens por pagina.
- `app-empty-state`: estado vazio com mensagem e acao opcional.
- `app-search-suggest`: busca com sugestoes.

## Regras de layout

- Usar paineis brancos com borda clara, raio de 8 a 10 px e sombra leve.
- Manter filtros em uma linha sempre que houver espaco.
- Botao principal em azul ou fundo escuro, conforme o padrao da tela.
- Botoes secundarios brancos com borda clara.
- Acoes perigosas em vermelho.
- Tabelas com cabecalho claro, linhas limpas e menu de acoes compacto.
- Evitar textos explicativos grandes no topo das telas.
- Evitar barras horizontais sempre que a tabela puder ser reorganizada.

## Permissoes

- `Consultar` deve ficar disponivel para usuarios com acesso de consulta ao modulo.
- `Editar`, `Duplicar`, `Inativar` e `Reativar` exigem acesso completo ao modulo.
- `Excluir` deve exigir permissao especifica de exclusao.
- Campos sensiveis devem respeitar permissoes proprias, como salario e custo.

## Busca e filtros

- A busca principal deve aceitar nome, codigo, documento, apelido e termos relacionados.
- Quando fizer sentido, usar sugestoes com `app-search-suggest`.
- Filtros avancados devem ficar recolhidos.
- Preferencias de colunas e itens por pagina podem ser salvas em `localStorage`.

## Estado vazio e carregamento

- Tela vazia deve explicar o motivo e oferecer acao quando permitido.
- Carregamento deve aparecer dentro da area de dados, sem deslocar o layout.

## Exemplo aplicado

A tela `Lojas` usa:

- Cards de total, ativas, fabricas, matriz e filiais.
- Filtros por empresa, tipo, cidade, status e CNPJ.
- Tabela com menu de acoes por linha.
- Colunas configuraveis.
- Exportacao CSV.
- Modais para exclusao, inativacao, reativacao e historico.

## Proximas telas candidatas

1. Clientes
2. Fornecedores
3. Funcionarios
4. Produtos de Revenda
5. Produtos Uso/Consumo e Insumos
6. Compras
7. Financeiro
8. Fiscal
9. Estoque
