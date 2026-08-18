import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { FornecedoresService } from '../../core/services/fornecedores.service';
import { LojasService } from '../../core/services/lojas.service';
import { NotasFiscaisEntradaService } from '../../core/services/notas-fiscais-entrada.service';
import { PedidosCompraService } from '../../core/services/pedidos-compra.service';
import { NotasFiscaisEntradaComponent } from './notas-fiscais-entrada.component';

describe('NotasFiscaisEntradaComponent', () => {
  let fixture: ComponentFixture<NotasFiscaisEntradaComponent>;
  let component: NotasFiscaisEntradaComponent;

  const nota = {
    id: 1,
    pedido_compra: 10,
    modelo: '55',
    serie: '1',
    numero: '123',
    chave_acesso: '35140130290862000106550010000000011000000016',
    dt_emissao: '2026-01-01',
    dt_entrada: '2026-01-02',
    status: 'AB' as const,
    valor_produtos: '100.00',
    valor_desconto: '0.00',
    valor_frete: '0.00',
    valor_total: '100.00',
    observacoes: '',
  };
  const notaFechada = { ...nota, id: 2, status: 'FE' as const };
  const notaCancelada = { ...nota, id: 3, status: 'CA' as const };
  const itemBase = {
    pedido_item: 101,
    nota_item: 201,
    produto: 1,
    produto_descricao: 'Produto A',
    produto_referencia: 'REF-A',
    cor: null,
    pack: null,
    descricao_livre: null,
    qtd_pedido: '2.000',
    qtd_recebida_outras_notas: '0.000',
    qtd_na_nota: '1.000',
    saldo_total_recebivel: '2.000',
    saldo_pendente: '1.000',
    preco_unit_pedido: '10.0000',
    quantidades_validas: [],
  };
  const itemOutro = {
    ...itemBase,
    pedido_item: 102,
    nota_item: null,
    produto_descricao: 'Produto B',
    produto_referencia: 'REF-B',
  };

  const notasApi = {
    listar: jasmine.createSpy('listar'),
    indicadores: jasmine.createSpy('indicadores'),
    get: jasmine.createSpy('get'),
    criar: jasmine.createSpy('criar'),
    atualizar: jasmine.createSpy('atualizar'),
    fechar: jasmine.createSpy('fechar'),
    cancelar: jasmine.createSpy('cancelar'),
    itensPedido: jasmine.createSpy('itensPedido'),
    criarItem: jasmine.createSpy('criarItem'),
    atualizarItem: jasmine.createSpy('atualizarItem'),
    removerItem: jasmine.createSpy('removerItem'),
  };
  const pedidosApi = { listar: jasmine.createSpy('pedidosListar') };
  const lojasApi = { list: jasmine.createSpy('lojasList') };
  const fornecedoresApi = { list: jasmine.createSpy('fornecedoresList') };

  beforeEach(async () => {
    localStorage.clear();
    notasApi.listar.and.returnValue(of({ count: 42, next: null, previous: null, results: [nota] }));
    notasApi.indicadores.and.returnValue(of({ total: 42, abertas: 20, fechadas: 15, canceladas: 7, valor_total: '1234.56' }));
    notasApi.get.and.returnValue(of(nota));
    notasApi.itensPedido.and.returnValue(of([itemBase, itemOutro]));
    notasApi.criarItem.and.returnValue(of({ id: 202, nota: nota.id, pedido_item: itemOutro.pedido_item, qtd_recebida: '2.000', preco_unit_nf: '10.0000', desconto_item: '0.00', total_item: '20.00' }));
    notasApi.atualizarItem.and.returnValue(of({ id: 201, nota: nota.id, pedido_item: itemBase.pedido_item, qtd_recebida: '1.000', preco_unit_nf: '10.0000', desconto_item: '0.00', total_item: '10.00' }));
    notasApi.removerItem.and.returnValue(of(undefined));
    pedidosApi.listar.and.returnValue(of({ count: 1, results: [{ id: 10, tipo: '2', loja: 3, fornecedor: 4, emissao: '2026-01-01', status: 'AP', total_itens: '100.00', total_desconto: '0.00', frete: '0.00', total_pedido: '100.00' }] }));
    lojasApi.list.and.returnValue(of({ count: 1, results: [{ id: 3, nome_loja: 'Loja A' }] }));
    fornecedoresApi.list.and.returnValue(of({ count: 1, results: [{ id: 4, nome_fornecedor: 'Fornecedor A' }] }));

    await TestBed.configureTestingModule({
      imports: [NotasFiscaisEntradaComponent],
      providers: [
        provideRouter([]),
        { provide: NotasFiscaisEntradaService, useValue: notasApi },
        { provide: PedidosCompraService, useValue: pedidosApi },
        { provide: LojasService, useValue: lojasApi },
        { provide: FornecedoresService, useValue: fornecedoresApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotasFiscaisEntradaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carrega pagina atual pelo backend sem page_size artificial de 1000', () => {
    expect(notasApi.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, page_size: 20 }));
    expect(notasApi.listar).not.toHaveBeenCalledWith(jasmine.objectContaining({ page_size: 1000 }));
    expect(component.notasPagina).toEqual([nota]);
    expect(component.total).toBe(42);
  });

  it('mudanca de pagina e de itens por pagina disparam nova consulta', () => {
    component.totalRecords = 42;

    component.nextPage();
    expect(notasApi.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page: 2, page_size: 20 }));

    component.onPageSizeChange('50');
    expect(notasApi.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, page_size: 50 }));
  });

  it('alteracao de filtro volta para primeira pagina e envia filtros ao backend', () => {
    component.page = 3;
    component.search = 'Alpha';
    component.filtroStatus = 'FE';
    component.filtroFornecedor = 4;
    component.filtroLoja = 3;
    component.filtroEmissaoDe = '2026-01-01';
    component.filtroEmissaoAte = '2026-01-31';
    component.filtroEntradaDe = '2026-02-01';
    component.filtroEntradaAte = '2026-02-28';
    component.filtroValorMin = 100;
    component.filtroValorMax = 500;

    component.applyFilter();

    expect(component.page).toBe(1);
    expect(notasApi.listar).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 1,
      page_size: 20,
      search: 'Alpha',
      status: 'FE',
      fornecedor: 4,
      loja: 3,
      dt_emissao_de: '2026-01-01',
      dt_emissao_ate: '2026-01-31',
      dt_entrada_de: '2026-02-01',
      dt_entrada_ate: '2026-02-28',
      valor_min: 100,
      valor_max: 500,
    }));
  });

  it('usa count e indicadores do backend sem calcular apenas sobre a pagina', () => {
    expect(component.total).toBe(42);
    expect(component.abertas).toBe(20);
    expect(component.fechadas).toBe(15);
    expect(component.canceladas).toBe(7);
    expect(component.valorTotalListado).toBe(1234.56);
    expect(notasApi.indicadores).toHaveBeenCalled();
  });

  it('limpa selecao quando registro selecionado sai da pagina atual', () => {
    component.selectedNota = { ...nota, id: 99 };

    component.loadNotas();

    expect(component.selectedNota).toBeNull();
  });

  it('tabela de itens nao possui coluna ou botoes de acoes por linha', () => {
    component.editar(nota);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const headers = Array.from(el.querySelectorAll('.itens-wrapper th')).map(th => th.textContent?.trim());
    expect(headers).not.toContain('Ações');
    expect(el.querySelector('.itens-wrapper .actions-cell')).toBeNull();
    expect(el.querySelectorAll('.itens-wrapper tbody .btn').length).toBe(0);
  });

  it('clicar em uma linha seleciona somente um item e aplica destaque', () => {
    component.editar(nota);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.itens-wrapper tbody tr') as NodeListOf<HTMLTableRowElement>;

    rows[0].click();
    fixture.detectChanges();
    expect(component.selectedItem?.pedido_item).toBe(101);
    expect(rows[0].classList.contains('selected')).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.itens-wrapper tbody tr.selected').length).toBe(1);

    rows[1].click();
    fixture.detectChanges();
    expect(component.selectedItem?.pedido_item).toBe(102);
    expect(rows[1].classList.contains('selected')).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.itens-wrapper tbody tr.selected').length).toBe(1);
  });

  it('barra de acoes atua sobre item selecionado e fica desabilitada sem selecao', () => {
    component.editar(nota);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.item-action-bar button') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(2);
    expect(buttons[0].disabled).toBeTrue();
    expect(buttons[1].disabled).toBeTrue();

    component.selecionarItem(component.itensPedido[0]);
    fixture.detectChanges();
    expect(buttons[0].disabled).toBeFalse();
    expect(buttons[1].disabled).toBeFalse();

    buttons[0].click();
    expect(notasApi.atualizarItem).toHaveBeenCalledWith(201, jasmine.objectContaining({ pedido_item: 101 }));

    buttons[1].click();
    expect(component.confirmModal?.item?.pedido_item).toBe(101);
  });

  it('remover item selecionado limpa selecao apos confirmacao', () => {
    component.editar(nota);
    component.selecionarItem(component.itensPedido[0]);

    component.removerItemSelecionado();
    component.confirmarAcao();

    expect(notasApi.removerItem).toHaveBeenCalledWith(201);
    expect(component.selectedItem).toBeNull();
  });

  it('trocar contexto limpa selecao antiga de item', () => {
    component.editar(nota);
    component.selecionarItem(component.itensPedido[0]);

    component.editar({ ...nota, id: 9, numero: '999' });

    expect(component.selectedItem).toBeNull();
  });

  it('estados AB FE e CA controlam alteracao dos itens', () => {
    component.editar(nota);
    component.selecionarItem(component.itensPedido[0]);
    expect(component.podeAlterarItemSelecionado()).toBeTrue();

    component.editar(notaFechada);
    component.selecionarItem(component.itensPedido[0]);
    expect(component.podeAlterarItemSelecionado()).toBeFalse();

    component.editar(notaCancelada);
    component.selecionarItem(component.itensPedido[0]);
    expect(component.podeAlterarItemSelecionado()).toBeFalse();
  });

  it('pedido selecionado exibe pedido loja fornecedor e tipo', () => {
    component.editar(nota);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Pedido');
    expect(text).toContain('10');
    expect(text).toContain('Loja');
    expect(text).toContain('3 - Loja A');
    expect(text).toContain('Fornecedor');
    expect(text).toContain('4 - Fornecedor A');
    expect(text).toContain('Uso/Consumo');
  });

  it('cabecalho bloqueia data de entrada anterior a emissao antes da chamada', () => {
    component.novo();
    component.form.patchValue({
      pedido_compra: 10,
      numero: '123',
      dt_emissao: '2026-08-11',
      dt_entrada: '2026-08-10',
    });

    component.salvarCabecalho();

    expect(component.erro).toContain('Data de entrada');
    expect(notasApi.criar).not.toHaveBeenCalled();
  });

  it('itens exibem pedida recebida anteriormente saldo pendente e nesta nf', () => {
    component.editar(nota);
    fixture.detectChanges();

    const headers = Array.from(fixture.nativeElement.querySelectorAll('.itens-wrapper th') as NodeListOf<HTMLElement>).map(th => th.textContent?.trim());
    expect(headers).toContain('Pedida');
    expect(headers).toContain('Já recebida');
    expect(headers).toContain('Saldo pendente');
    expect(headers).toContain('Nesta NF');
  });

  it('desconto acima do bruto impede envio e desconto igual ao bruto e aceito', () => {
    notasApi.atualizarItem.calls.reset();
    component.editar(nota);
    const item = component.itensPedido[0];
    component.selecionarItem(item);
    item.qtd_receber = 10;
    item.saldo_total_recebivel = '10.000';
    item.preco_unit_nf = 5;
    item.desconto_item = 50.01;

    component.salvarItemSelecionado();

    expect(component.erro).toContain('Desconto do item');
    expect(notasApi.atualizarItem).not.toHaveBeenCalled();

    item.desconto_item = 50;
    component.salvarItemSelecionado();

    expect(notasApi.atualizarItem).toHaveBeenCalledWith(201, jasmine.objectContaining({ desconto_item: '50' }));
  });

  it('desconto negativo impede envio e total visual nunca fica negativo', () => {
    component.editar(nota);
    const item = component.itensPedido[0];
    item.qtd_receber = 1;
    item.preco_unit_nf = 5;
    item.desconto_item = 10;
    component.recalcularItem(item);
    expect(item.total_item).toBe(0);

    item.desconto_item = -1;
    component.selecionarItem(item);
    component.salvarItemSelecionado();

    expect(component.erro).toContain('Desconto do item');
  });

  it('validacoes de quantidade e pack continuam funcionando', () => {
    component.editar(nota);
    const item = component.itensPedido[0];
    item.qtd_receber = 3;
    item.saldo_total_recebivel = '2.000';

    component.salvarItem(item);
    expect(component.erro).toContain('Quantidade recebida');

    const itemPack = { ...item, qtd_receber: 3, saldo_total_recebivel: '10.000', pack: 1, quantidades_validas: ['2', '4'] };
    component.salvarItem(itemPack);
    expect(component.erro).toContain('precisa fechar com o pack');
  });

  it('nao importa RowActionsMenuComponent para os itens da nf', () => {
    component.editar(nota);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-row-actions-menu')).toBeNull();
  });
});
