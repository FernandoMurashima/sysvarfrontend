import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { DistribuicaoService } from './distribuicao.service';

describe('DistribuicaoService', () => {
  let service: DistribuicaoService;
  let http: HttpTestingController;
  const base = `${environment.apiBaseUrl}/distribuicao`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DistribuicaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carrega distribuicoes quando a API devolve array sem paginacao', () => {
    const rows = [{ id: 1, numero: 'D1' }] as any[];

    service.listAll({ status: 'CONF' }).subscribe(resp => expect(resp).toEqual(rows));

    const req = http.expectOne(r => r.url === `${base}/distribuicoes/` && r.params.get('status') === 'CONF');
    req.flush(rows);
  });

  it('carrega uma pagina paginada com next nulo', () => {
    const rows = [{ id: 1, numero: 'D1' }] as any[];

    service.listAll({ origem: 44 }).subscribe(resp => expect(resp).toEqual(rows));

    const req = http.expectOne(r => r.url === `${base}/distribuicoes/` && r.params.get('origem') === '44');
    req.flush({ count: 1, next: null, previous: null, results: rows });
  });

  it('segue next e concatena multiplas paginas preservando ordem', () => {
    const page2 = `${base}/distribuicoes/?page=2&status=CONF`;
    const page3 = `${base}/distribuicoes/?page=3&status=CONF`;
    let result: any[] = [];

    service.listAll({ status: 'CONF' }).subscribe(resp => result = resp);

    http.expectOne(r => r.url === `${base}/distribuicoes/` && r.params.get('status') === 'CONF')
      .flush({ count: 4, next: page2, previous: null, results: [{ id: 1 }, { id: 2 }] });
    http.expectOne(page2)
      .flush({ count: 4, next: page3, previous: `${base}/distribuicoes/`, results: [{ id: 3 }] });
    http.expectOne(page3)
      .flush({ count: 4, next: null, previous: page2, results: [{ id: 4 }] });

    expect(result.map(row => row.id)).toEqual([1, 2, 3, 4]);
  });

  it('normaliza next absoluto para URL interna e preserva query', () => {
    const next = `http://127.0.0.1:8000${base}/pedidos-venda/?page=2&search=abc&status=AGF`;
    let result: any[] = [];

    service.listAllPedidos({ search: 'abc', status: 'AGF' }).subscribe(resp => result = resp);

    http.expectOne(r => r.url === `${base}/pedidos-venda/` && r.params.get('search') === 'abc' && r.params.get('status') === 'AGF')
      .flush({ count: 2, next, previous: null, results: [{ id: 1 }] });
    const second = http.expectOne(`${base}/pedidos-venda/?page=2&search=abc&status=AGF`);
    expect(second.request.urlWithParams).toBe(`${base}/pedidos-venda/?page=2&search=abc&status=AGF`);
    second.flush({ count: 2, next: null, previous: `${base}/pedidos-venda/`, results: [{ id: 2 }] });

    expect(result.map(row => row.id)).toEqual([1, 2]);
  });

  it('nao duplica itens ao concatenar paginas de transito', () => {
    const page2 = `${base}/transitos/?page=2&status=TRANS`;
    let result: any[] = [];

    service.listAllTransitos({ status: 'TRANS' }).subscribe(resp => result = resp);

    http.expectOne(r => r.url === `${base}/transitos/` && r.params.get('status') === 'TRANS')
      .flush({ count: 3, next: page2, previous: null, results: [{ id: 1 }, { id: 2 }] });
    http.expectOne(page2)
      .flush({ count: 3, next: null, previous: `${base}/transitos/`, results: [{ id: 3 }] });

    expect(result.map(row => row.id)).toEqual([1, 2, 3]);
    expect(new Set(result.map(row => row.id)).size).toBe(3);
  });

  it('propaga erro na segunda pagina sem emitir resultado parcial', () => {
    const page2 = `${base}/transitos/?page=2&status=TRANS`;
    let emitted = false;
    let failed = false;

    service.listAllTransitos({ status: 'TRANS' }).subscribe({
      next: () => emitted = true,
      error: () => failed = true,
    });

    http.expectOne(r => r.url === `${base}/transitos/` && r.params.get('status') === 'TRANS')
      .flush({ count: 2, next: page2, previous: null, results: [{ id: 1 }] });
    http.expectOne(page2).flush({ detail: 'falha' }, { status: 500, statusText: 'Server Error' });

    expect(emitted).toBeFalse();
    expect(failed).toBeTrue();
  });

  it('nao segue next externo fora do endpoint esperado', () => {
    let emitted = false;
    let failed = false;

    service.listAll({ status: 'CONF' }).subscribe({
      next: () => emitted = true,
      error: () => failed = true,
    });

    http.expectOne(r => r.url === `${base}/distribuicoes/` && r.params.get('status') === 'CONF')
      .flush({ count: 2, next: 'https://example.com/api/outro/?page=2', previous: null, results: [{ id: 1 }] });

    http.expectNone('https://example.com/api/outro/?page=2');
    expect(emitted).toBeFalse();
    expect(failed).toBeTrue();
  });
});
