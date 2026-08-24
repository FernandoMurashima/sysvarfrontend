import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { EstoqueMovimentacaoUsoConsumoComponent } from './estoque-movimentacao-uso-consumo.component';

describe('EstoqueMovimentacaoUsoConsumoComponent', () => {
  let fixture: ComponentFixture<EstoqueMovimentacaoUsoConsumoComponent>;
  let component: EstoqueMovimentacaoUsoConsumoComponent;
  let estoqueApi: jasmine.SpyObj<EstoqueService>;
  let lojasApi: jasmine.SpyObj<LojasService>;
  let produtosApi: jasmine.SpyObj<ProdutosService>;

  beforeEach(async () => {
    estoqueApi = jasmine.createSpyObj<EstoqueService>('EstoqueService', ['listMovimentacoesUsoConsumo']);
    lojasApi = jasmine.createSpyObj<LojasService>('LojasService', ['list']);
    produtosApi = jasmine.createSpyObj<ProdutosService>('ProdutosService', ['list']);

    lojasApi.list.and.returnValue(of({ count: 2, results: [
      { id: 1, nome_loja: 'Matriz' } as any,
      { id: 2, nome_loja: 'Filial' } as any
    ] }));
    produtosApi.list.and.returnValue(of({ count: 2, results: [
      { Idproduto: 10, tipo_produto: '2', referencia: 'USO-000010', descricao: 'Papel A4' } as any,
      { Idproduto: 20, tipo_produto: '1', referencia: '26-01-01001', descricao: 'Produto venda' } as any
    ] }));
    estoqueApi.listMovimentacoesUsoConsumo.and.returnValue(of({ count: 2, results: [
      { id: 1, produto: 10, produto_tipo: '2', produto_referencia: 'USO-000010', produto_descricao: 'Papel A4', loja: 1, loja_nome: 'Matriz', tipo: 'ENTRADA', quantidade: '7.000', saldo_anterior: '0.000', saldo_posterior: '7.000', documento: 'NFE:21:ENTRADA', origem: 'NFE:21', destino: 'Matriz', data_movimento: '2026-08-24T10:00:00Z' } as any,
      { id: 2, produto: 20, produto_tipo: '1', produto_referencia: '26-01-01001', produto_descricao: 'Produto venda', loja: 1, loja_nome: 'Matriz', tipo: 'ENTRADA', quantidade: '1.000', saldo_anterior: '0.000', saldo_posterior: '1.000', data_movimento: '2026-08-24T10:00:00Z' } as any
    ] }));

    await TestBed.configureTestingModule({
      imports: [EstoqueMovimentacaoUsoConsumoComponent],
      providers: [
        provideRouter([]),
        { provide: EstoqueService, useValue: estoqueApi },
        { provide: LojasService, useValue: lojasApi },
        { provide: ProdutosService, useValue: produtosApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EstoqueMovimentacaoUsoConsumoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('mostra NF de Uso/Consumo com quantidade loja e saldos e oculta produto de venda', () => {
    expect(component.movimentos.length).toBe(1);
    expect(component.movimentos[0].produto_referencia).toBe('USO-000010');
    expect(component.movimentos[0].loja_nome).toBe('Matriz');
    expect(component.movimentos[0].quantidade).toBe('7.000');
    expect(component.movimentos[0].saldo_posterior).toBe('7.000');
    expect(component.movimentos.some(m => m.produto_referencia === '26-01-01001')).toBeFalse();
  });

  it('envia filtro por referência', () => {
    component.search = 'USO-000010';
    component.buscar();

    expect(estoqueApi.listMovimentacoesUsoConsumo).toHaveBeenCalledWith(jasmine.objectContaining({ search: 'USO-000010' }));
    expect(produtosApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ tipo_produto: '2', search: 'USO-000010' }));
  });

  it('envia filtro por loja e tipo', () => {
    component.loja = '1';
    component.tipo = 'ENTRADA';
    component.load();

    expect(estoqueApi.listMovimentacoesUsoConsumo).toHaveBeenCalledWith(jasmine.objectContaining({ loja: '1', tipo: 'ENTRADA' }));
  });
});
