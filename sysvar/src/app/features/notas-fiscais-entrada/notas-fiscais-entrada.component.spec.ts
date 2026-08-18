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
    pedidosApi.listar.and.returnValue(of({ count: 0, results: [] }));
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
});
