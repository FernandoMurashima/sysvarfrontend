import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { RequisicoesService } from '../../core/services/requisicoes.service';
import { OrdensServicoComponent } from './ordens-servico.component';

describe('OrdensServicoComponent', () => {
  let fixture: ComponentFixture<OrdensServicoComponent>;
  let component: OrdensServicoComponent;
  let api: jasmine.SpyObj<RequisicoesService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<RequisicoesService>('RequisicoesService', ['listarOrdensServico', 'getOrdemServico', 'atualizarOrdemServico', 'lojasPermitidas']);
    api.listarOrdensServico.and.returnValue(of([]));
    api.lojasPermitidas.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [OrdensServicoComponent],
      providers: [
        { provide: RequisicoesService, useValue: api },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OrdensServicoComponent);
    component = fixture.componentInstance;
  });

  it('lista ordens de servico filtrando status e tipo', () => {
    component.filtroStatus = 'ABERTA';
    component.filtroTipo = 'TI';
    component.carregar();
    expect(api.listarOrdensServico).toHaveBeenCalledWith(jasmine.objectContaining({ status: 'ABERTA', tipo: 'TI' }));
  });

  it('converte labels basicos de status e tipo', () => {
    expect(component.statusLabel('EM_ATENDIMENTO')).toBe('Em atendimento');
    expect(component.tipoLabel('MANUTENCAO')).toBe('Manutenção');
  });
});
