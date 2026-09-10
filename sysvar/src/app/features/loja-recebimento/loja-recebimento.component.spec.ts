import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { DistribuicaoService } from '../../core/services/distribuicao.service';
import { LojaRecebimentoComponent } from './loja-recebimento.component';

describe('LojaRecebimentoComponent', () => {
  let component: LojaRecebimentoComponent;
  let fixture: ComponentFixture<LojaRecebimentoComponent>;
  let api: jasmine.SpyObj<DistribuicaoService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<DistribuicaoService>('DistribuicaoService', ['listAllTransitos']);
    api.listAllTransitos.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [LojaRecebimentoComponent],
      providers: [
        { provide: DistribuicaoService, useValue: api },
        { provide: AuthService, useValue: { getUserType: () => 'Admin', podeAcessarModulo: () => true } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(LojaRecebimentoComponent);
    component = fixture.componentInstance;
  });

  it('carrega transitos alem do limite antigo de 1000 antes de agrupar notas', () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({
      id: index + 1,
      pedido: 1,
      pedido_item: index + 1,
      distribuicao_destino: 1,
      unidade_origem: 44,
      unidade_origem_nome: 'Fabrica',
      loja_destino: 10,
      loja_destino_nome: 'Loja 10',
      sku: index + 1,
      ean13: `789${index + 1}`,
      quantidade_enviada: 1,
      quantidade_recebida: 0,
      quantidade_divergente: 0,
      status: 'TRANS',
      nfe_numero: '123',
      referencia: `REF-${index + 1}`,
      descricao: `Produto ${index + 1}`,
    } as any));
    api.listAllTransitos.and.returnValue(of(rows));

    component.load();

    expect(api.listAllTransitos).toHaveBeenCalledWith({ search: '', status: 'TRANS' });
    expect(component.transitos.length).toBe(1001);
    expect(component.totalNotas).toBe(1);
    expect(component.totalPecas).toBe(1001);
    expect(component.notas[0].itens.length).toBe(1001);
  });

  it('mantem agrupamento da mesma NF-e quando itens viriam de paginas diferentes', () => {
    api.listAllTransitos.and.returnValue(of([
      {
        id: 1,
        pedido: 1,
        pedido_item: 1,
        distribuicao_destino: 1,
        unidade_origem: 44,
        unidade_origem_nome: 'Fabrica',
        loja_destino: 10,
        loja_destino_nome: 'Loja 10',
        sku: 1,
        ean13: '7891',
        quantidade_enviada: 2,
        quantidade_recebida: 1,
        quantidade_divergente: 1,
        status: 'TRANS',
        nfe_numero: 'NF-9',
      } as any,
      {
        id: 2,
        pedido: 1,
        pedido_item: 2,
        distribuicao_destino: 1,
        unidade_origem: 44,
        unidade_origem_nome: 'Fabrica',
        loja_destino: 10,
        loja_destino_nome: 'Loja 10',
        sku: 2,
        ean13: '7892',
        quantidade_enviada: 3,
        quantidade_recebida: 0,
        quantidade_divergente: 0,
        status: 'TRANS',
        nfe_numero: 'NF-9',
      } as any,
    ]));

    component.load();

    expect(component.notas.length).toBe(1);
    expect(component.notas[0].nfe_numero).toBe('NF-9');
    expect(component.notas[0].itens.map(item => item.id)).toEqual([1, 2]);
    expect(component.notas[0].pecas).toBe(5);
    expect(component.notas[0].recebido).toBe(1);
    expect(component.notas[0].divergente).toBe(1);
  });
});
