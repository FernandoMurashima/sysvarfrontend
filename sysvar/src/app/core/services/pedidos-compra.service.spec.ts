import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { PedidosCompraService } from './pedidos-compra.service';

describe('PedidosCompraService', () => {
  let service: PedidosCompraService;
  let http: HttpTestingController;

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
});
