import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { PedidosCompraService } from './pedidos-compra.service';

describe('PedidosCompraService', () => {
  let service: PedidosCompraService;
  let http: HttpTestingController;
  const itensUrl = `${environment.apiBaseUrl}/compras/itens/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PedidosCompraService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta o resumo consolidado de recebimentos do pedido', () => {
    service.getRecebimentosResumo(7).subscribe(resp => {
      expect(resp.resumo.quantidade_pedida_total).toBe('696.000');
    });

    const req = http.expectOne(`${environment.apiBaseUrl}/compras/pedidos/7/recebimentos-resumo/`);
    expect(req.request.method).toBe('GET');
    req.flush({
      pedido_id: 7,
      resumo: {
        quantidade_pedida_total: '696.000',
        quantidade_recebida_total: '225.000',
        saldo_total: '471.000',
        situacao: 'PARCIAL',
      },
      itens: [],
      documentos: [],
    });
  });

  it('lista itens por pedido quando a API devolve array sem paginacao', () => {
    const rows = [{ id: 1, pedido: 7 }, { id: 2, pedido: 7 }];

    service.listItensByPedido(7).subscribe(resp => {
      expect(resp).toEqual(rows);
    });

    const req = http.expectOne(r => r.url === itensUrl && r.params.get('pedido') === '7');
    expect(req.request.method).toBe('GET');
    req.flush(rows);
  });

  it('lista itens por pedido quando a API devolve uma pagina paginada', () => {
    const rows = [{ id: 1, pedido: 7 }];

    service.listItensByPedido(7).subscribe(resp => {
      expect(resp).toEqual(rows);
    });

    const req = http.expectOne(r => r.url === itensUrl && r.params.get('pedido') === '7');
    req.flush({ count: 1, next: null, previous: null, results: rows });
  });

  it('percorre duas paginas usando next e concatena os itens', () => {
    const next = `${itensUrl}?page=2&pedido=7`;
    const result: any[][] = [];

    service.listItensByPedido(7).subscribe(resp => result.push(resp));

    const first = http.expectOne(r => r.url === itensUrl && r.params.get('pedido') === '7');
    first.flush({ count: 3, next, previous: null, results: [{ id: 1, pedido: 7 }, { id: 2, pedido: 7 }] });

    const second = http.expectOne(next);
    second.flush({ count: 3, next: null, previous: itensUrl, results: [{ id: 3, pedido: 7 }] });

    expect(result[0].map(row => row.id)).toEqual([1, 2, 3]);
  });

  it('percorre tres ou mais paginas ate next nulo sem chamadas extras', () => {
    const page2 = `${itensUrl}?page=2&pedido=7`;
    const page3 = `${itensUrl}?page=3&pedido=7`;
    let result: any[] = [];

    service.listItensByPedido(7).subscribe(resp => result = resp);

    http.expectOne(r => r.url === itensUrl && r.params.get('pedido') === '7')
      .flush({ count: 4, next: page2, previous: null, results: [{ id: 1, pedido: 7 }] });
    http.expectOne(page2)
      .flush({ count: 4, next: page3, previous: itensUrl, results: [{ id: 2, pedido: 7 }, { id: 3, pedido: 7 }] });
    http.expectOne(page3)
      .flush({ count: 4, next: null, previous: page2, results: [{ id: 4, pedido: 7 }] });

    expect(result.map(row => row.id)).toEqual([1, 2, 3, 4]);
    http.expectNone(`${itensUrl}?page=4&pedido=7`);
  });

  it('propaga erro de pagina intermediaria sem emitir conjunto parcial', () => {
    const next = `${itensUrl}?page=2&pedido=7`;
    let emitted = false;
    let failed = false;

    service.listItensByPedido(7).subscribe({
      next: () => emitted = true,
      error: () => failed = true,
    });

    http.expectOne(r => r.url === itensUrl && r.params.get('pedido') === '7')
      .flush({ count: 2, next, previous: null, results: [{ id: 1, pedido: 7 }] });
    http.expectOne(next).flush({ detail: 'falha' }, { status: 500, statusText: 'Server Error' });

    expect(emitted).toBeFalse();
    expect(failed).toBeTrue();
  });

  it('mantem somente os itens retornados pelo filtro do pedido solicitado', () => {
    const page2 = `${itensUrl}?page=2&pedido=7`;
    let result: any[] = [];

    service.listItensByPedido(7).subscribe(resp => result = resp);

    const first = http.expectOne(r => r.url === itensUrl && r.params.get('pedido') === '7');
    expect(first.request.params.has('pedido')).toBeTrue();
    first.flush({ count: 2, next: page2, previous: null, results: [{ id: 1, pedido: 7 }] });
    http.expectOne(page2).flush({ count: 2, next: null, previous: itensUrl, results: [{ id: 2, pedido: 7 }] });

    expect(result.every(row => row.pedido === 7)).toBeTrue();
  });
});
