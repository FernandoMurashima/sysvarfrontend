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

  it('importacao XML envia FormData com pedido opcional', () => {
    const file = new File(['<nfe />'], 'nfe.xml', { type: 'text/xml' });
    service.importarXml(file).subscribe();
    let req = http.expectOne(request => request.method === 'POST' && request.url.endsWith('/fiscal/notas-entrada/importar-xml/'));
    expect(req.request.body instanceof FormData).toBeTrue();
    expect((req.request.body as FormData).get('arquivo')).toBe(file);
    expect((req.request.body as FormData).has('pedido_compra')).toBeFalse();
    req.flush({});

    service.importarXml(file, 10).subscribe();
    req = http.expectOne(request => request.method === 'POST' && request.url.endsWith('/fiscal/notas-entrada/importar-xml/'));
    expect((req.request.body as FormData).get('pedido_compra')).toBe('10');
    req.flush({});
  });

  it('chama endpoints operacionais XML e cancelamento', () => {
    service.listarItensXml(1).subscribe();
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/fiscal/notas-entrada/1/itens-xml/')).flush([]);
    service.conciliarAutomaticamente(1).subscribe();
    http.expectOne(r => r.method === 'POST' && r.url.endsWith('/fiscal/notas-entrada/1/conciliar-automaticamente/')).flush({});
    service.candidatosItemXml(1, 2, 'camisa').subscribe();
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/fiscal/notas-entrada/1/item-xml-candidatos/') && r.params.get('item') === '2' && r.params.get('q') === 'camisa').flush([]);
    service.conciliarItemXml(1, 2, 3).subscribe();
    http.expectOne(r => r.method === 'POST' && r.url.endsWith('/fiscal/notas-entrada/1/item-xml-conciliar/') && r.body.item === 2 && r.body.produto === 3).flush({});
    service.conferirItemXml(1, 2, 0).subscribe();
    http.expectOne(r => r.method === 'POST' && r.url.endsWith('/fiscal/notas-entrada/1/item-xml-conferir/') && r.body.quantidade_recebida === '0').flush({});
    service.analisarCancelamento(1).subscribe();
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/fiscal/notas-entrada/1/analisar-cancelamento/')).flush({});
    service.cobrancaFinanceira(1).subscribe();
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/fiscal/notas-entrada/1/cobranca-financeira/')).flush({});
    service.vincularFormaPagamentoFiscal(1, '15', 8).subscribe();
    http.expectOne(r => r.method === 'POST' && r.url.endsWith('/fiscal/notas-entrada/1/vincular-forma-pagamento-fiscal/') && r.body.codigo_tpag === '15' && r.body.forma_pagamento === 8).flush({});
    service.cancelar(1, 'Erro operacional', true).subscribe();
    const cancelarReq = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/fiscal/notas-entrada/1/cancelar/') && r.body.motivo === 'Erro operacional' && r.body.confirmar_avisos === true);
    expect(cancelarReq.request.body.confirmar_avisos).toBeTrue();
    cancelarReq.flush({});
  });
});
