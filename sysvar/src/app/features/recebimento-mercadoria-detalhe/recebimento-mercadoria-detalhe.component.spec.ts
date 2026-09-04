import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RecebimentoMercadoriaService } from '../../core/services/recebimento-mercadoria.service';
import { RecebimentoMercadoriaDetalheComponent } from './recebimento-mercadoria-detalhe.component';

describe('RecebimentoMercadoriaDetalheComponent', () => {
  let fixture: ComponentFixture<RecebimentoMercadoriaDetalheComponent>;
  let component: RecebimentoMercadoriaDetalheComponent;
  let api: jasmine.SpyObj<RecebimentoMercadoriaService>;

  const pedido1 = { id: 1, emissao: '2026-09-01', fornecedor_nome: 'Fornecedor A', loja_nome: 'Loja A', quantidade: '2.000', valor: '10.00', status: 'AP', status_label: 'Aprovado' } as any;
  const pedido2 = { id: 2, emissao: '2026-09-02', fornecedor_nome: 'Fornecedor A', loja_nome: 'Loja A', quantidade: '3.000', valor: '15.00', status: 'AT', status_label: 'Atendido' } as any;
  const recebimento = {
    id: 8,
    loja_nome: 'Loja A',
    fornecedor_nome: 'Fornecedor A',
    status: 'ABERTO',
    status_label: 'Aberto',
    criado_em: '2026-09-04T09:00:00-03:00',
    xml_fornecedor_dados: { numero: '123', serie: '1', chave_acesso: '35260822345678000195550010000001234567890121', valor_total: '25.00' },
    pedidos: [pedido1],
  } as any;

  beforeEach(async () => {
    api = jasmine.createSpyObj<RecebimentoMercadoriaService>('RecebimentoMercadoriaService', ['get', 'pedidosElegiveis', 'vincularPedidos']);
    api.get.and.returnValue(of(recebimento));
    api.pedidosElegiveis.and.returnValue(of([pedido1, pedido2]));
    api.vincularPedidos.and.returnValue(of({ ...recebimento, pedidos: [pedido1, pedido2] }));

    await TestBed.configureTestingModule({
      imports: [RecebimentoMercadoriaDetalheComponent],
      providers: [
        { provide: RecebimentoMercadoriaService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '8' } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecebimentoMercadoriaDetalheComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exibe detalhe e pedidos vinculados sem confirmar estoque', () => {
    const text = fixture.nativeElement.textContent;
    expect(api.get).toHaveBeenCalledWith(8);
    expect(text).toContain('Recebimento #8');
    expect(text).toContain('Fornecedor A');
    expect(text).toContain('Loja A');
    expect(text).toContain('123 / 1');
    expect(text).not.toContain('Confirmar estoque');
  });

  it('carrega pedidos elegiveis, permite selecao multipla e salva vinculos', () => {
    component.abrirPedidos();
    component.togglePedido(pedido2, true);
    component.salvarPedidos();

    expect(api.pedidosElegiveis).toHaveBeenCalledWith(8);
    expect(api.vincularPedidos).toHaveBeenCalledWith(8, [1, 2]);
    expect(component.recebimento?.pedidos.length).toBe(2);
  });

  it('exibe erro de API ao buscar pedidos elegiveis', () => {
    api.pedidosElegiveis.and.returnValue(throwError(() => ({ status: 500 })));
    component.abrirPedidos();

    expect(component.errorMsg).toBe('Não foi possível carregar os pedidos elegíveis.');
  });
});
