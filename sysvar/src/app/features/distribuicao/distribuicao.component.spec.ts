import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NEVER, of } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { DistribuicaoService } from '../../core/services/distribuicao.service';
import { LojasService } from '../../core/services/lojas.service';
import { DistribuicaoComponent } from './distribuicao.component';

describe('DistribuicaoComponent', () => {
  let component: DistribuicaoComponent;
  let fixture: ComponentFixture<DistribuicaoComponent>;
  let api: jasmine.SpyObj<DistribuicaoService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<DistribuicaoService>('DistribuicaoService', ['listAll', 'listAllPerfis', 'atualizarDestino']);
    api.listAll.and.returnValue(of([]));
    api.listAllPerfis.and.returnValue(of([]));
    api.atualizarDestino.and.returnValue(NEVER);

    TestBed.configureTestingModule({
      imports: [DistribuicaoComponent],
      providers: [
        { provide: DistribuicaoService, useValue: api },
        { provide: LojasService, useValue: { list: jasmine.createSpy('list').and.returnValue(of([])) } },
        { provide: AuthService, useValue: { podeAcessarModulo: () => true } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(DistribuicaoComponent);
    component = fixture.componentInstance;
  });

  it('carrega distribuicoes sem depender do limite antigo de 500 e calcula indicadores com todas', () => {
    const rows = Array.from({ length: 501 }, (_, index) => ({
      id: index + 1,
      numero: `D${index + 1}`,
      unidade_origem: 44,
      data: '2026-09-10',
      tipo: 'MANUAL',
      origem_operacao: 'MANUAL',
      status: index % 2 === 0 ? 'CONF' : 'RASC',
      fator_preco: 0.2,
      quantidade_total: 1,
      valor_total_custo: 10,
      valor_total_venda: 12,
    } as any));
    api.listAll.and.returnValue(of(rows));

    component.load();

    expect(api.listAll).toHaveBeenCalledWith({ search: '', origem: '', status: '', data_ini: '', data_fim: '' });
    expect(component.totalDistribuicoes).toBe(501);
    expect(component.totalPecas).toBe(501);
    expect(component.distribuicoesFiltradas.length).toBe(501);
  });

  it('preserva saldo zero calculado na matriz', () => {
    const item = itemMatriz({ quantidade_selecionada: 10, destinos: [
      destinoMatriz(1, 4),
      destinoMatriz(2, 3),
      destinoMatriz(3, 3),
    ] });
    component.selecionada = distribuicaoMatriz([item]);

    (component as any).prepareMatrix();

    expect(component.totalItem(item)).toBe(10);
    expect(component.saldoItem(item)).toBe(0);
  });

  it('mantem saldo positivo quando a distribuicao ainda nao consumiu toda a quantidade', () => {
    const item = itemMatriz({ quantidade_selecionada: 10, destinos: [
      destinoMatriz(1, 4),
      destinoMatriz(2, 3),
    ] });
    component.selecionada = distribuicaoMatriz([item]);

    (component as any).prepareMatrix();

    expect(component.totalItem(item)).toBe(7);
    expect(component.saldoItem(item)).toBe(3);
  });

  it('mantem o saldo correto ao editar uma quantidade na matriz', () => {
    const destino = destinoMatriz(1, 2);
    const item = itemMatriz({ quantidade_selecionada: 10, destinos: [destino] });
    component.selecionada = distribuicaoMatriz([item]);
    (component as any).prepareMatrix();

    component.ajustarDestino(destino, '7');

    expect(api.atualizarDestino).toHaveBeenCalledWith(10, destino.id, 7);
    expect(component.totalItem(item)).toBe(7);
    expect(component.saldoItem(item)).toBe(3);
  });

  it('mostra custo e venda por SKU na matriz e remove esses campos do resumo', () => {
    const itemComCusto = itemMatriz({ custo_unitario: 89.9, quantidade_selecionada: 10, destinos: [destinoMatriz(1, 5)] });
    const itemSemCusto = itemMatriz({ id: 2, referencia: 'SKU-2', custo_unitario: 0, quantidade_selecionada: 1, destinos: [destinoMatriz(1, 1, 2)] });
    component.selecionada = distribuicaoMatriz([itemComCusto, itemSemCusto], 0.2);
    component.detalheAberto = true;

    (component as any).prepareMatrix();
    fixture.detectChanges();

    const summaryText = text('.distribution-summary');
    const headers = Array.from(fixture.nativeElement.querySelectorAll('.matrix-table thead th') as NodeListOf<Element>).map(el => normalize(el.textContent));

    expect(summaryText).not.toContain('Custo un.');
    expect(summaryText).not.toContain('Venda un.');
    expect(headers).toContain('Custo un.');
    expect(headers).toContain('Venda un.');
    expect(component.money(component.custoUnitarioItem(itemComCusto))).toContain('89,90');
    expect(component.money(component.vendaUnitariaItem(itemComCusto))).toContain('107,88');
    expect(component.money(component.custoUnitarioItem(itemSemCusto))).toContain('0,00');
  });

  function text(selector: string): string {
    return normalize(fixture.nativeElement.querySelector(selector)?.textContent);
  }

  function normalize(value: string | null | undefined): string {
    return (value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function distribuicaoMatriz(itens: any[], fatorPreco = 0.2): any {
    return {
      id: 10,
      numero: 'D10',
      unidade_origem: 44,
      unidade_origem_nome: 'Matriz',
      data: '2026-09-10',
      tipo: 'MANUAL',
      origem_operacao: 'MANUAL',
      status: 'RASC',
      fator_preco: fatorPreco,
      quantidade_total: 10,
      valor_total_custo: 100,
      valor_total_venda: 120,
      destinos: [],
      itens,
    };
  }

  function itemMatriz(overrides: any = {}): any {
    return {
      id: 1,
      referencia: 'SKU-1',
      descricao: 'Produto teste',
      ean13: '789',
      cor_descricao: 'Azul',
      tamanho_descricao: 'M',
      quantidade_selecionada: 10,
      custo_unitario: 10,
      destinos: [],
      ...overrides,
    };
  }

  function destinoMatriz(lojaDestino: number, quantidade: number, id = lojaDestino): any {
    return {
      id,
      loja_destino: lojaDestino,
      loja_nome: `Loja ${lojaDestino}`,
      quantidade_sugerida: quantidade,
      quantidade_ajustada: quantidade,
    };
  }
});
