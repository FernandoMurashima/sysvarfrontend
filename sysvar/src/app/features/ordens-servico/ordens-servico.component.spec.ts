import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ProdutosService } from '../../core/services/produtos.service';
import { RequisicoesService } from '../../core/services/requisicoes.service';
import { OrdensServicoComponent } from './ordens-servico.component';

describe('OrdensServicoComponent', () => {
  let fixture: ComponentFixture<OrdensServicoComponent>;
  let component: OrdensServicoComponent;
  let api: jasmine.SpyObj<RequisicoesService>;
  let produtosApi: jasmine.SpyObj<ProdutosService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<RequisicoesService>('RequisicoesService', ['listarOrdensServico', 'getOrdemServico', 'atualizarOrdemServico', 'lojasPermitidas', 'criarMaterialOrdemServico', 'atualizarMaterialOrdemServico', 'removerMaterialOrdemServico', 'atenderMaterialOrdemServico']);
    produtosApi = jasmine.createSpyObj<ProdutosService>('ProdutosService', ['list']);
    api.listarOrdensServico.and.returnValue(of([]));
    api.lojasPermitidas.and.returnValue(of([]));
    produtosApi.list.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [OrdensServicoComponent],
      providers: [
        { provide: RequisicoesService, useValue: api },
        { provide: ProdutosService, useValue: produtosApi },
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

  it('abre ordem de servico em subtela com botao fechar', () => {
    api.getOrdemServico.and.returnValue(of(osBase()));

    component.abrir(osBase());
    fixture.detectChanges();

    expect(component.selected?.id).toBe(3);
    expect(fixture.nativeElement.querySelector('.os-subscreen')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Fechar');
  });

  it('fecha subtela e atualiza lista', () => {
    component.selected = osBase();
    api.listarOrdensServico.calls.reset();

    component.fecharSubtela();

    expect(component.selected).toBeNull();
    expect(api.listarOrdensServico).toHaveBeenCalled();
  });
});

function osBase(): any {
  return {
    id: 3,
    requisicao: 16,
    requisicao_numero: 16,
    empresa: 1,
    loja: 1,
    loja_nome: 'Fabrica',
    setor_solicitante: 1,
    setor_solicitante_nome: 'TI',
    setor_responsavel: 2,
    setor_responsavel_nome: 'TI',
    tipo: 'TI',
    origem: 'REQUISICAO',
    descricao: 'Computador sem rede',
    status: 'EM_ATENDIMENTO',
    responsavel: null,
    diagnostico: '',
    solucao: '',
    previsao_atendimento: null,
    data_inicio: null,
    data_conclusao: null,
    observacoes: '',
    materiais: [],
  };
}
