import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { XmlFornecedorRecebidoService } from './xml-fornecedor-recebido.service';

describe('XmlFornecedorRecebidoService', () => {
  let service: XmlFornecedorRecebidoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(XmlFornecedorRecebidoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia filtros e paginacao ao backend', () => {
    service.listar({
      loja: 2,
      fornecedor: 3,
      status_operacional: 'DETECTADO',
      situacao_fiscal: 'AUTORIZADA',
      search: '123',
      detectado_de: '2026-09-01',
      detectado_ate: '2026-09-04',
      page: 2,
      page_size: 25,
    }).subscribe();

    const req = http.expectOne(request => request.method === 'GET' && request.url === `${environment.apiBaseUrl}/fiscal/xmls-fornecedor-recebidos/`);
    expect(req.request.params.get('loja')).toBe('2');
    expect(req.request.params.get('fornecedor')).toBe('3');
    expect(req.request.params.get('status_operacional')).toBe('DETECTADO');
    expect(req.request.params.get('situacao_fiscal')).toBe('AUTORIZADA');
    expect(req.request.params.get('search')).toBe('123');
    expect(req.request.params.get('detectado_de')).toBe('2026-09-01');
    expect(req.request.params.get('detectado_ate')).toBe('2026-09-04');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('page_size')).toBe('25');
    req.flush({ count: 0, results: [] });
  });

  it('busca indicadores sem paginacao', () => {
    service.indicadores({ page: 3, page_size: 10, status_operacional: 'DETECTADO' }).subscribe();

    const req = http.expectOne(request => request.method === 'GET' && request.url.endsWith('/fiscal/xmls-fornecedor-recebidos/indicadores/'));
    expect(req.request.params.has('page')).toBeFalse();
    expect(req.request.params.has('page_size')).toBeFalse();
    expect(req.request.params.get('status_operacional')).toBe('DETECTADO');
    req.flush({ total: 1, detectadas: 1, aguardando_recebimento: 0, em_recebimento: 0, recebidas_processadas: 0, pendentes: 1 });
  });
});
