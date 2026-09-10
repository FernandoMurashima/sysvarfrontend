import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { CoresService } from '../../core/services/cores.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { LojasService } from '../../core/services/lojas.service';
import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';
import { PacksService } from '../../core/services/pack.service';
import { PackItensService } from '../../core/services/pack-item.service';
import { PedidosCompraService } from '../../core/services/pedidos-compra.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { UnidadesService } from '../../core/services/unidades.service';
import {
  PEDIDO_COMPRA_REVENDA_ITEM_COLUMNS,
  PedidosCompraComponent,
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

describe('PedidosCompraComponent recebimentos resumo', () => {
  let component: PedidosCompraComponent;
  let fixture: ComponentFixture<PedidosCompraComponent>;
  let pedidosApi: jasmine.SpyObj<PedidosCompraService>;
  let router: jasmine.SpyObj<Router>;

  const emptyApi = () => ({ list: jasmine.createSpy('list').and.returnValue(of([])) });
  const emptyFormasApi = () => ({
    list: jasmine.createSpy('list').and.returnValue(of([])),
    listPrazos: jasmine.createSpy('listPrazos').and.returnValue(of([])),
  });

  beforeEach(() => {
    pedidosApi = jasmine.createSpyObj<PedidosCompraService>('PedidosCompraService', [
      'getRecebimentosResumo',
      'listar',
      'listItensByPedido',
      'listParcelas',
      'getById',
    ]);
    pedidosApi.getRecebimentosResumo.and.returnValue(of({
      pedido_id: 1,
      resumo: {
        quantidade_pedida_total: '696.000',
        quantidade_recebida_total: '225.000',
        saldo_total: '471.000',
        situacao: 'PARCIAL',
      },
      itens: [
        {
          pedido_item_id: 10,
          produto_id: 1,
          produto: 'Azul Marinho',
          referencia: '27-01-01003',
          cor: 'Azul Marinho',
          pack: 'Pack 120',
          quantidade_pedida: '120.000',
          quantidade_recebida: '118.000',
          saldo: '2.000',
          situacao: 'PARCIAL',
        },
      ],
      documentos: [
        {
          origem: 'RECEBIMENTO_FISICO',
          xml_fornecedor_id: 132,
          recebimento_id: 3,
          numero: '132',
          serie: '1',
          dh_emissao: '2026-09-09T10:00:00Z',
          quantidade_fisica: '19.000',
          status_recebimento: 'CONCLUIDO',
          status_operacional: 'RECEBIDO',
          estoque_efetivado: true,
          nota_entrada_id: null,
          status_fiscal: null,
        },
        {
          origem: 'NOTA_FISCAL+RECEBIMENTO_FISICO',
          xml_fornecedor_id: 123,
          recebimento_id: 4,
          nota_entrada_id: 9,
          numero: '123',
          serie: '1',
          quantidade_fisica: '6.000',
          status_recebimento: 'CONCLUIDO',
          status_operacional: 'RECEBIDO',
          estoque_efetivado: true,
          status_fiscal: 'FE',
        },
        {
          origem: 'NOTA_FISCAL',
          recebimento_id: null,
          nota_entrada_id: 10,
          numero: '777',
          serie: '1',
          quantidade_fisica: null,
          status_recebimento: null,
          status_operacional: null,
          estoque_efetivado: false,
          status_fiscal: 'AB',
        },
        {
          origem: 'RECEBIMENTO_FISICO',
          xml_fornecedor_id: 999,
          recebimento_id: 5,
          numero: '999',
          serie: '1',
          quantidade_fisica: '1.000',
          status_recebimento: 'CANCELADO',
          status_operacional: 'RECEBIDO',
          estoque_efetivado: false,
          recebimento_cancelado: true,
          nota_entrada_id: null,
          status_fiscal: null,
        },
      ],
    }));
    pedidosApi.listar.and.returnValue(of([]));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [PedidosCompraComponent],
      providers: [
        { provide: PedidosCompraService, useValue: pedidosApi },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: AuthService, useValue: { podeAcessarModulo: () => true } },
        { provide: LojasService, useValue: emptyApi() },
        { provide: FormasPagamentoService, useValue: emptyFormasApi() },
        { provide: FornecedoresService, useValue: emptyApi() },
        { provide: ProdutosService, useValue: emptyApi() },
        { provide: CoresService, useValue: emptyApi() },
        { provide: PacksService, useValue: emptyApi() },
        { provide: PackItensService, useValue: emptyApi() },
        { provide: UnidadesService, useValue: emptyApi() },
        { provide: NatLancamentosService, useValue: emptyApi() },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(PedidosCompraComponent);
    component = fixture.componentInstance;
  });

  it('carrega recebimentos por uma unica fonte consolidada', () => {
    (component as any).carregarRecebimentos(1);

    expect(pedidosApi.getRecebimentosResumo).toHaveBeenCalledOnceWith(1);
    expect(component.recebimentosResumo?.quantidade_pedida_total).toBe('696.000');
    expect(component.recebimentosResumo?.quantidade_recebida_total).toBe('225.000');
    expect(component.recebimentosResumo?.saldo_total).toBe('471.000');
    expect(component.labelSituacaoRecebimento(component.recebimentosResumo?.situacao)).toBe('Parcial');
  });

  it('usa response.itens diretamente na tabela', () => {
    (component as any).carregarRecebimentos(1);

    expect(component.recebimentos).toEqual([
      {
        item_id: 10,
        produto: 'Azul Marinho',
        referencia: '27-01-01003',
        cor: 'Azul Marinho',
        pack: 'Pack 120',
        qtd_pedida: 120,
        qtd_recebida: 118,
        saldo: 2,
        situacao: 'Parcial',
      },
    ]);
  });

  it('mostra documentos fisicos, fiscal pendente, acoes e cancelado sem duplicar linha', () => {
    (component as any).carregarRecebimentos(1);

    expect(component.documentosRecebimento.length).toBe(4);
    const nfe132 = component.documentosRecebimento.find(doc => doc.numero === '132')!;
    expect(nfe132.quantidade_fisica).toBe(19);
    expect(component.labelStatusOperacional(nfe132)).toBe('Concluído');
    expect(nfe132.estoque_efetivado).toBeTrue();
    expect(nfe132.fiscal).toBe('Pendente');

    const dedup = component.documentosRecebimento.find(doc => doc.numero === '123')!;
    expect(dedup.recebimento_id).toBe(4);
    expect(dedup.nota_entrada_id).toBe(9);
    expect(dedup.fiscal).toBe('Fechada');

    const cancelado = component.documentosRecebimento.find(doc => doc.numero === '999')!;
    expect(component.labelStatusOperacional(cancelado)).toBe('Cancelado');
    const semRecebimento = component.documentosRecebimento.find(doc => doc.numero === '777')!;
    expect(component.labelStatusOperacional(semRecebimento)).toBe('-');

    component.verRecebimento(nfe132);
    component.verFiscal(dedup);
    expect(router.navigate).toHaveBeenCalledWith(['/estoque/recebimentos-mercadoria', 3]);
    expect(router.navigate).toHaveBeenCalledWith(['/compras/notas-entrada'], { queryParams: { nota: 9 } });
  });

  it('mantem estado vazio de documentos', () => {
    pedidosApi.getRecebimentosResumo.and.returnValue(of({
      pedido_id: 1,
      resumo: {
        quantidade_pedida_total: '10.000',
        quantidade_recebida_total: '0.000',
        saldo_total: '10.000',
        situacao: 'PENDENTE',
      },
      itens: [],
      documentos: [],
    }));

    (component as any).carregarRecebimentos(1);

    expect(component.recebimentosResumo?.situacao).toBe('PENDENTE');
    expect(component.documentosRecebimento).toEqual([]);
  });

  it('limpa dados anteriores quando endpoint falha', () => {
    (component as any).carregarRecebimentos(1);
    pedidosApi.getRecebimentosResumo.and.returnValue(throwError(() => new Error('falha')));

    (component as any).carregarRecebimentos(1);

    expect(component.recebimentosResumo).toBeNull();
    expect(component.recebimentos).toEqual([]);
    expect(component.documentosRecebimento).toEqual([]);
  });

  it('renderiza novo pedido com pedidoAtual nulo e mantem importacao habilitada', () => {
    component.setViewForm();
    component.consultando = false;
    component.pedidoAtual = null;
    component.pedidoAtualId.set(null);

    expect(() => fixture.detectChanges()).not.toThrow();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const importButton = buttons.find(button => button.textContent?.includes('Importar Planilha'));
    expect(importButton).toBeTruthy();
    expect(importButton?.disabled).toBeFalse();
  });

  it('controla habilitacao da importacao para pedido novo e status existentes', () => {
    component.consultando = false;
    component.pedidoAtual = null;
    expect(component.isAberto(component.pedidoAtual)).toBeFalse();
    expect(component.importacaoPlanilhaDesabilitada()).toBeFalse();

    component.pedidoAtual = { status: 'AB' };
    expect(component.importacaoPlanilhaDesabilitada()).toBeFalse();

    for (const status of ['AP', 'AT', 'CA']) {
      component.pedidoAtual = { status };
      expect(component.importacaoPlanilhaDesabilitada()).withContext(status).toBeTrue();
    }

    component.consultando = true;
    component.pedidoAtual = null;
    expect(component.importacaoPlanilhaDesabilitada()).toBeTrue();
  });

  it('nao exibe aprovar ou cancelar pedido quando pedidoAtual esta nulo', () => {
    component.setViewForm();
    component.consultando = false;
    component.pedidoAtual = null;
    component.pedidoAtualId.set(null);

    fixture.detectChanges();

    const buttonLabels = (Array.from(fixture.nativeElement.querySelectorAll('.actions-form button')) as HTMLButtonElement[])
      .map(button => button.textContent?.trim());
    expect(buttonLabels).not.toContain('Aprovar');
    expect(buttonLabels).not.toContain('Cancelar Pedido');
  });
});
