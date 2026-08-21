import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CotacoesService } from '../../core/services/cotacoes.service';
import { CotacoesComponent } from './cotacoes.component';

describe('CotacoesComponent', () => {
  let fixture: ComponentFixture<CotacoesComponent>;
  let component: CotacoesComponent;
  let api: jasmine.SpyObj<CotacoesService>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<CotacoesService>('CotacoesService', ['listar', 'lojasPermitidas', 'criar', 'atualizar']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['podeAcessarModulo', 'getCurrentUser']);
    api.listar.and.returnValue(of([{ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any]));
    api.lojasPermitidas.and.returnValue(of([{ id: 2, nome_loja: 'Loja A' }]));
    api.criar.and.returnValue(of({ id: 8, numero: 2, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any));
    api.atualizar.and.returnValue(of({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'URGENTE', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any));
    auth.podeAcessarModulo.and.returnValue(true);
    auth.getCurrentUser.and.returnValue({ id: 3, username: 'cotador', empresa: { id: 1, nome: 'Empresa A' } } as any);

    await TestBed.configureTestingModule({
      imports: [CotacoesComponent],
      providers: [
        { provide: CotacoesService, useValue: api },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CotacoesComponent);
    component = fixture.componentInstance;
  });

  it('carrega listagem e lojas permitidas', () => {
    component.ngOnInit();
    expect(api.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page_size: 500 }));
    expect(api.lojasPermitidas).toHaveBeenCalled();
    expect(component.cotacoes.length).toBe(1);
    expect(component.lojas[0].label).toContain('Loja A');
  });

  it('exibe Nova Cotacao conforme EDIT', () => {
    auth.podeAcessarModulo.and.returnValue(true);
    expect(component.podeEditar).toBeTrue();
    auth.podeAcessarModulo.and.returnValue(false);
    expect(component.podeEditar).toBeFalse();
  });

  it('salva cabecalho novo', () => {
    component.nova();
    component.form.patchValue({ loja: 2, tipo_compra: 'USO_CONSUMO', prioridade: 'URGENTE', observacao: 'Teste' });
    component.salvar();
    expect(api.criar).toHaveBeenCalledWith(jasmine.objectContaining({ loja: 2, tipo_compra: 'USO_CONSUMO', prioridade: 'URGENTE', observacao: 'Teste' }));
  });

  it('salva edicao de cabecalho em elaboracao', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.form.patchValue({ prioridade: 'URGENTE' });
    component.salvar();
    expect(api.atualizar).toHaveBeenCalledWith(7, jasmine.objectContaining({ prioridade: 'URGENTE' }));
  });
});
