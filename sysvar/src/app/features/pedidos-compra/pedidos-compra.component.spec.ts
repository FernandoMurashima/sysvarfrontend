import {
  PEDIDO_COMPRA_REVENDA_ITEM_COLUMNS,
  displayPedidoCompraItemPack,
  displayPedidoCompraItemProduto,
} from './pedidos-compra.component';

describe('PedidosCompraComponent item display helpers', () => {
  it('mostra descricao_reduzida quando disponivel', () => {
    expect(displayPedidoCompraItemProduto({
      produto_descricao_reduzida: 'CALCA LEGGING URB.',
      produto_label: 'CALCA LEGGING URBANA LONGA',
      produto_referencia: '27-01-01003',
    })).toBe('CALCA LEGGING URB.');
  });

  it('usa descricao como fallback quando descricao_reduzida esta vazia', () => {
    expect(displayPedidoCompraItemProduto({
      produto_descricao_reduzida: '',
      produto_label: 'CALCA LEGGING URBANA LONGA',
      produto_referencia: '27-01-01003',
    })).toBe('CALCA LEGGING URBANA LONGA');
  });

  it('preserva referencia como fallback final da coluna Produto', () => {
    expect(displayPedidoCompraItemProduto({
      produto_descricao_reduzida: '',
      produto_label: '',
      produto_referencia: '27-01-01003',
    })).toBe('27-01-01003');
  });

  it('mantem a coluna Codigo de barras fora da grade principal de revenda', () => {
    expect([...PEDIDO_COMPRA_REVENDA_ITEM_COLUMNS] as string[]).not.toContain('Código de barras');
  });

  it('nao possui coluna de SKUs na grade principal de revenda', () => {
    expect(PEDIDO_COMPRA_REVENDA_ITEM_COLUMNS.some(col => col.includes('SKU'))).toBeFalse();
  });

  it('mantem a ordem final das colunas de revenda', () => {
    expect([...PEDIDO_COMPRA_REVENDA_ITEM_COLUMNS]).toEqual([
      'Produto',
      'Referência',
      'Cor',
      'Pack',
      'Packs',
      'Qtd',
      'Preço',
      'Desc',
      'Total',
    ]);
  });

  it('exibe o nome real do pack quando disponivel', () => {
    expect(displayPedidoCompraItemPack({
      pack_nome: 'Grade Feminina 17',
      pack: 17,
    })).toBe('Grade Feminina 17');
  });

  it('usa identificador do pack como fallback quando nome real nao vem no payload', () => {
    expect(displayPedidoCompraItemPack({
      pack_nome: '',
      pack: 17,
    })).toBe('17');
  });

  it('mantem valores numericos sem transformar Pack, Packs, Qtd e totais', () => {
    const item = {
      pack_nome: '17',
      n_packs: 10,
      quantidade: 120,
      preco_unit: 85,
      desconto_valor: 0,
      total_item: 10200,
    };

    expect(item.pack_nome).toBe('17');
    expect(item.n_packs).toBe(10);
    expect(item.quantidade).toBe(120);
    expect(item.preco_unit).toBe(85);
    expect(item.desconto_valor).toBe(0);
    expect(item.total_item).toBe(10200);
  });
});
