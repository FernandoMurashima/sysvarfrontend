# PDV Desktop - Teste Completo

## 1. Preparar online

1. Acessar `/vendas/pdv-desktop`.
2. Confirmar rodape `ONLINE`.
3. Clicar em `Atualizar catálogo`.
4. Confirmar mensagem de SKUs atualizados.
5. Pesquisar produto por descrição.
6. Confirmar coluna `Estoque`.

## 2. Venda online

1. Digitar ou bipar um EAN com estoque.
2. Pressionar `Enter`.
3. Confirmar item no carrinho.
4. Selecionar forma de pagamento.
5. Finalizar venda.
6. Confirmar documento gerado.
7. Confirmar baixa no estoque.
8. Confirmar financeiro/caixa conforme forma de pagamento.

## 3. Bloqueio de estoque

1. Pesquisar SKU com estoque zero.
2. Tentar lançar no carrinho.
3. Confirmar mensagem de bloqueio.
4. Tentar aumentar quantidade acima do saldo.
5. Confirmar bloqueio.

## 4. Venda offline no navegador

1. Com catálogo atualizado, colocar navegador offline.
2. Confirmar rodape `OFFLINE`.
3. Pesquisar produto pelo catálogo local.
4. Lançar produto com estoque.
5. Abrir caixa local.
6. Finalizar venda.
7. Confirmar venda offline gravada.
8. Confirmar contador de pendentes.
9. Confirmar baixa local do estoque.

## 5. Sincronização

1. Voltar navegador online.
2. Clicar em `Sincronizar X pendente(s)`.
3. Confirmar contador zerado.
4. Confirmar venda criada no backend.
5. Confirmar estoque, financeiro e caixa.

## 6. Cupom

1. Com itens no carrinho, clicar no botão do menu superior direito.
2. Confirmar abertura da janela de impressão.
3. Confirmar descrição, EAN, quantidade, valor e total.

## 7. Pendências conhecidas

1. Electron com banco local real.
2. NFC-e em contingência real.
3. TEF real.
4. Impressão térmica parametrizada.
5. Fechamento de caixa offline/online.
