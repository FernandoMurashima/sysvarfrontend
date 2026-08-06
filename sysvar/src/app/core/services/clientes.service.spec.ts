import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ClientesService } from './clientes.service';

describe('ClientesService documento funcional', () => {
  let service: ClientesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('create não cria campo cpf automaticamente', () => {
    service.create({ nome_cliente: 'Maria Cliente', tipo_pessoa: 'PF', documento: '52998224725' }).subscribe();

    const req = http.expectOne(request => request.method === 'POST' && request.url.endsWith('/cadastros/clientes/'));
    expect(req.request.body).toEqual(jasmine.objectContaining({ documento: '52998224725' }));
    expect(Object.prototype.hasOwnProperty.call(req.request.body, 'cpf')).toBeFalse();
    req.flush({ id: 1, nome_cliente: 'Maria Cliente' });
  });

  it('update não cria campo cpf automaticamente', () => {
    service.update(7, { nome_cliente: 'Empresa Cliente', tipo_pessoa: 'PJ', documento: '11222333000181' }).subscribe();

    const req = http.expectOne(request => request.method === 'PUT' && request.url.endsWith('/cadastros/clientes/7/'));
    expect(req.request.body).toEqual(jasmine.objectContaining({ documento: '11222333000181' }));
    expect(Object.prototype.hasOwnProperty.call(req.request.body, 'cpf')).toBeFalse();
    req.flush({ id: 7, nome_cliente: 'Empresa Cliente' });
  });

  it('patch não cria campo cpf automaticamente', () => {
    service.patch(8, { documento: '52998224725' }).subscribe();

    const req = http.expectOne(request => request.method === 'PATCH' && request.url.endsWith('/cadastros/clientes/8/'));
    expect(req.request.body).toEqual({ documento: '52998224725' });
    expect(Object.prototype.hasOwnProperty.call(req.request.body, 'cpf')).toBeFalse();
    req.flush({ id: 8, nome_cliente: 'Cliente' });
  });

  it('historico consulta endpoint paginado do cliente', () => {
    service.historico(8, 2, 5).subscribe();

    const req = http.expectOne(request =>
      request.method === 'GET' &&
      request.url.endsWith('/cadastros/clientes/8/historico/') &&
      request.params.get('page') === '2' &&
      request.params.get('page_size') === '5'
    );
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('page_size')).toBe('5');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });
});
