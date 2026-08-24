import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { EstoqueConsultaUsoConsumoComponent } from './estoque-consulta-uso-consumo.component';

describe('EstoqueConsultaUsoConsumoComponent', () => {
  let fixture: ComponentFixture<EstoqueConsultaUsoConsumoComponent>;
  let component: EstoqueConsultaUsoConsumoComponent;
  let estoqueApi: jasmine.SpyObj<EstoqueService>;
  let lojasApi: jasmine.SpyObj<LojasService>;
  let produtosApi: jasmine.SpyObj<ProdutosService>;

  beforeEach(async () => {
    estoqueApi = jasmine.createSpyObj<EstoqueService>('EstoqueService', ['listUsoConsumo']);
    lojasApi = jasmine.createSpyObj<LojasService>('LojasService', ['list']);
    produtosApi = jasmine.createSpyObj<ProdutosService>('ProdutosService', ['list']);

    lojasApi.list.and.returnValue(of({ count: 2, results: [
      { id: 1, nome_loja: 'Matriz' } as any,
      { id: 2, nome_loja: 'Filial' } as any
    ] }));
    produtosApi.list.and.returnValue(of({ count: 2, results: [
      { Idproduto: 10, tipo_produto: '2', referencia: 'USO-000010', descricao: 'Papel A4', unidade: 'UN' } as any,
      { Idproduto: 20, tipo_produto: '1', referencia: '26-01-01001', descricao: 'Produto venda', unidade: 'UN' } as any
    ] }));
    estoqueApi.listUsoConsumo.and.returnValue(of({ count: 1, results: [
      { id: 1, produto: 10, produto_tipo: '2', produto_referencia: 'USO-000010', produto_descricao: 'Papel A4', loja: 1, loja_nome: 'Matriz', saldo: '7.000' } as any
    ] }));

    await TestBed.configureTestingModule({
      imports: [EstoqueConsultaUsoConsumoComponent],
      providers: [
        provideRouter([]),
        { provide: EstoqueService, useValue: estoqueApi },
        { provide: LojasService, useValue: lojasApi },
        { provide: ProdutosService, useValue: produtosApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EstoqueConsultaUsoConsumoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('mostra produto de Uso/Consumo com saldo na loja da entrada e não mostra produto de venda', () => {
    expect(component.rows.some(row => row.referencia === 'USO-000010' && row.loja === 'Matriz' && row.saldo === 7)).toBeTrue();
    expect(component.rows.some(row => row.referencia === '26-01-01001')).toBeFalse();
  });

  it('filtra por loja', () => {
    component.loja = '1';
    component.load();

    expect(estoqueApi.listUsoConsumo).toHaveBeenCalledWith(jasmine.objectContaining({ loja: '1' }));
    expect(component.rows.every(row => row.lojaId === 1)).toBeTrue();
  });

  it('filtra somente com saldo', () => {
    component.filtroSaldo = 'com_saldo';
    component.load();

    expect(component.rows.length).toBe(1);
    expect(component.rows[0].saldo).toBe(7);
  });

  it('filtra zerados', () => {
    component.filtroSaldo = 'zerados';
    component.load();

    expect(component.rows.length).toBe(1);
    expect(component.rows[0].loja).toBe('Filial');
    expect(component.rows[0].saldo).toBe(0);
  });

  it('busca por referência usando somente tipo_produto 2', () => {
    component.search = 'USO-000010';
    component.buscar();

    expect(produtosApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ search: 'USO-000010', tipo_produto: '2' }));
    expect(component.rows.every(row => row.referencia === 'USO-000010')).toBeTrue();
  });
});
