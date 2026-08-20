import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { RequisicoesService } from '../../core/services/requisicoes.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { RequisicoesComponent } from './requisicoes.component';

describe('RequisicoesComponent permissoes', () => {
  let fixture: ComponentFixture<RequisicoesComponent>;
  let component: RequisicoesComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let api: jasmine.SpyObj<RequisicoesService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['podeAcessarModulo', 'getCurrentUser']);
    api = jasmine.createSpyObj<RequisicoesService>('RequisicoesService', [
      'listar',
      'listarCategorias',
      'listarCategoriasMaterial',
      'listarFinalidadesAquisicao',
      'listarSetores',
    ]);
    api.listar.and.returnValue(of([]));
    api.listarCategorias.and.returnValue(of([]));
    api.listarCategoriasMaterial.and.returnValue(of([]));
    api.listarFinalidadesAquisicao.and.returnValue(of([]));
    api.listarSetores.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RequisicoesComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: RequisicoesService, useValue: api },
        { provide: LojasService, useValue: { list: () => of([]) } },
        { provide: UnidadesService, useValue: { list: () => of([]) } },
        { provide: ProdutosService, useValue: { list: () => of([]) } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RequisicoesComponent);
    component = fixture.componentInstance;
    auth.getCurrentUser.and.returnValue({ id: 1 } as any);
  });

  function permissoes(ativos: string[]): void {
    auth.podeAcessarModulo.and.callFake((modulo: any, edit?: boolean) => {
      if (!ativos.includes(modulo)) return false;
      return modulo === 'requisicoes_todas' || edit === true;
    });
  }

  it('Joao somente Requisitar ve Minhas e Nova, sem Todas', () => {
    permissoes(['requisicoes']);
    expect(component.podeEditar).toBeTrue();
    expect(component.visoesDisponiveis).toEqual(['minhas']);
    expect(component.podeVerTodas).toBeFalse();
  });

  it('Paula com Requisitar, Analisar e Visualizar todas ve as abas correspondentes', () => {
    permissoes(['requisicoes', 'requisicoes_analise', 'requisicoes_todas']);
    expect(component.visoesDisponiveis).toEqual(['minhas', 'para_analisar', 'todas']);
  });

  it('usuario somente Atender inicia em Para Atender', () => {
    permissoes(['requisicoes_atendimento']);
    component.ngOnInit();
    expect(component.visao).toBe('para_atender');
    expect(api.listar).toHaveBeenCalledWith(jasmine.objectContaining({ visao: 'para_atender' }));
  });

  it('usuario sem direitos nao ganha abas de Requisicoes', () => {
    permissoes([]);
    expect(component.podeEditar).toBeFalse();
    expect(component.podeAprovar).toBeFalse();
    expect(component.podeAtender).toBeFalse();
    expect(component.podeVerTodas).toBeFalse();
  });
});
