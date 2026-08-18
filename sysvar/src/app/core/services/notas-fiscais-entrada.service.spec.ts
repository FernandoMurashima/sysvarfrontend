import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { NotasFiscaisEntradaService } from './notas-fiscais-entrada.service';

describe('NotasFiscaisEntradaService', () => {
  let service: NotasFiscaisEntradaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotasFiscaisEntradaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('envia paginacao e filtros preenchidos para listagem', () => {
    service.listar({
      page: 2,
      page_size: 50,
      search: 'Alpha',
      pedido: 10,
      fornecedor: 20,
      loja: 30,
      status: 'FE',
      numero: '123',
      chave_acesso: '3514',
      dt_emissao_de: '2026-01-01',
      dt_emissao_ate: '2026-01-31',
      dt_entrada_de: '2026-02-01',
      dt_entrada_ate: '2026-02-28',
      valor_min: 100,
      valor_max: 500,
    }).subscribe();

    const req = http.expectOne(request =>
      request.method === 'GET' &&
      request.url.endsWith('/fiscal/notas-entrada/') &&
      request.params.get('page') === '2' &&
      request.params.get('page_size') === '50'
    );
    expect(req.request.params.get('search')).toBe('Alpha');
    expect(req.request.params.get('pedido')).toBe('10');
    expect(req.request.params.get('fornecedor')).toBe('20');
    expect(req.request.params.get('loja')).toBe('30');
    expect(req.request.params.get('status')).toBe('FE');
    expect(req.request.params.get('numero')).toBe('123');
    expect(req.request.params.get('chave_acesso')).toBe('3514');
    expect(req.request.params.get('dt_emissao_de')).toBe('2026-01-01');
    expect(req.request.params.get('dt_emissao_ate')).toBe('2026-01-31');
    expect(req.request.params.get('dt_entrada_de')).toBe('2026-02-01');
    expect(req.request.params.get('dt_entrada_ate')).toBe('2026-02-28');
    expect(req.request.params.get('valor_min')).toBe('100');
    expect(req.request.params.get('valor_max')).toBe('500');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('indicadores usam endpoint agregado sem parametros de pagina', () => {
    service.indicadores({ page: 3, page_size: 10, status: 'AB', fornecedor: 5 }).subscribe();

    const req = http.expectOne(request =>
      request.method === 'GET' &&
      request.url.endsWith('/fiscal/notas-entrada/indicadores/') &&
      request.params.get('status') === 'AB' &&
      request.params.get('fornecedor') === '5'
    );
    expect(req.request.params.has('page')).toBeFalse();
    expect(req.request.params.has('page_size')).toBeFalse();
    req.flush({ total: 2, abertas: 2, fechadas: 0, canceladas: 0, valor_total: '100.00' });
  });
});
