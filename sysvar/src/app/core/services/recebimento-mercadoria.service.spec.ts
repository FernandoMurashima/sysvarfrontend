import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { RecebimentoMercadoriaService } from './recebimento-mercadoria.service';

describe('RecebimentoMercadoriaService', () => {
  let service: RecebimentoMercadoriaService;
  let http: HttpTestingController;
  const base = `${environment.apiBaseUrl}/fiscal/recebimentos-mercadoria/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RecebimentoMercadoriaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista recebimentos com parametros', () => {
    service.listar({ page_size: 50, status: 'ABERTO' }).subscribe();
    const req = http.expectOne(r => r.url === base && r.params.get('page_size') === '50' && r.params.get('status') === 'ABERTO');
    expect(req.request.method).toBe('GET');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('inicia recebimento por XML', () => {
    service.iniciarPorXml(7).subscribe();
    const req = http.expectOne(`${base}iniciar-por-xml/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ xml_fornecedor: 7 });
    req.flush({ id: 3 });
  });

  it('lista pedidos elegiveis e salva vinculos', () => {
    service.pedidosElegiveis(3).subscribe();
    const lista = http.expectOne(`${base}3/pedidos-elegiveis/`);
    expect(lista.request.method).toBe('GET');
    lista.flush([]);

    service.vincularPedidos(3, [1, 2]).subscribe();
    const salvar = http.expectOne(`${base}3/vincular-pedidos/`);
    expect(salvar.request.method).toBe('POST');
    expect(salvar.request.body).toEqual({ pedidos: [1, 2] });
    salvar.flush({ id: 3, pedidos: [] });
  });

  it('gera e salva conferencia fisica', () => {
    service.gerarConferencia(3).subscribe();
    const gerar = http.expectOne(`${base}3/gerar-conferencia/`);
    expect(gerar.request.method).toBe('POST');
    expect(gerar.request.body).toEqual({});
    gerar.flush({ id: 3, conferencia_itens: [] });

    service.salvarConferencia(3, [{ id: 8, quantidade_recebida: '2' }]).subscribe();
    const salvar = http.expectOne(`${base}3/salvar-conferencia/`);
    expect(salvar.request.method).toBe('POST');
    expect(salvar.request.body).toEqual({ itens: [{ id: 8, quantidade_recebida: '2' }] });
    salvar.flush({ id: 3, conferencia_itens: [] });
  });

  it('encerra conferencia fisica', () => {
    service.encerrarConferencia(3, 'Divergência justificada').subscribe();
    const req = http.expectOne(`${base}3/encerrar-conferencia/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ observacao_divergencia: 'Divergência justificada' });
    req.flush({ id: 3, status: 'CONCLUIDO' });
  });
});
