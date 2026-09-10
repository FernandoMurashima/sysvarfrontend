import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { DistribuicaoService } from '../../core/services/distribuicao.service';
import { PedidosVendaDistribuicaoComponent } from './pedidos-venda-distribuicao.component';

describe('PedidosVendaDistribuicaoComponent', () => {
  let component: PedidosVendaDistribuicaoComponent;
  let fixture: ComponentFixture<PedidosVendaDistribuicaoComponent>;
  let api: jasmine.SpyObj<DistribuicaoService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<DistribuicaoService>('DistribuicaoService', ['listAllPedidos']);
    api.listAllPedidos.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [PedidosVendaDistribuicaoComponent],
      providers: [
        { provide: DistribuicaoService, useValue: api },
        { provide: AuthService, useValue: { podeAcessarModulo: () => true } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(PedidosVendaDistribuicaoComponent);
    component = fixture.componentInstance;
  });

  it('carrega pedidos alem do limite antigo de 500 e usa todos nos totais locais', () => {
    const rows = Array.from({ length: 501 }, (_, index) => ({
      id: index + 1,
      numero: `PV${index + 1}`,
      distribuicao: 1,
      unidade_origem: 44,
      loja_destino: 10,
      data_pedido: '2026-09-10',
      status: 'AGF',
      quantidade_total: 1,
      valor_total_custo: 10,
      valor_total_venda: 20,
      faturamento_status: 'PENDENTE',
    } as any));
    api.listAllPedidos.and.returnValue(of(rows));

    component.load();

    expect(api.listAllPedidos).toHaveBeenCalledWith({ search: '', status: '' });
    expect(component.totalPedidos).toBe(501);
    expect(component.totalPecas).toBe(501);
    expect(component.totalValor).toBe(10020);
  });
});
