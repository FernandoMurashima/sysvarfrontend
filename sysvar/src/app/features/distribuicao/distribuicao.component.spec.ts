import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { DistribuicaoService } from '../../core/services/distribuicao.service';
import { LojasService } from '../../core/services/lojas.service';
import { DistribuicaoComponent } from './distribuicao.component';

describe('DistribuicaoComponent', () => {
  let component: DistribuicaoComponent;
  let fixture: ComponentFixture<DistribuicaoComponent>;
  let api: jasmine.SpyObj<DistribuicaoService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<DistribuicaoService>('DistribuicaoService', ['listAll', 'listAllPerfis']);
    api.listAll.and.returnValue(of([]));
    api.listAllPerfis.and.returnValue(of([]));

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
});
