import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
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
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['podeProcesso', 'getCurrentUser']);
    api = jasmine.createSpyObj<RequisicoesService>('RequisicoesService', [
      'listar',
      'lojasPermitidas',
      'listarCategorias',
      'listarCategoriasMaterial',
      'listarFinalidadesAquisicao',
      'listarSetores',
    ]);
    api.listar.and.returnValue(of([]));
    api.lojasPermitidas.and.returnValue(of([]));
    api.listarCategorias.and.returnValue(of([]));
    api.listarCategoriasMaterial.and.returnValue(of([]));
    api.listarFinalidadesAquisicao.and.returnValue(of([]));
    api.listarSetores.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RequisicoesComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: RequisicoesService, useValue: api },
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
    auth.podeProcesso.and.callFake((codigo: string) => ativos.includes(codigo));
  }

  it('Joao somente Requisitar ve Minhas e Nova, sem Todas', () => {
    permissoes(['requisicoes.fazer']);
    expect(component.podeEditar).toBeTrue();
    expect(component.visoesDisponiveis).toEqual(['minhas']);
  });

  it('Paula com Requisitar e Analisar ve as abas correspondentes', () => {
    permissoes(['requisicoes.fazer', 'requisicoes.aprovar']);
    expect(component.visoesDisponiveis).toEqual(['minhas', 'para_analisar']);
  });

  it('usuario somente Atender inicia em Para Atender', () => {
    permissoes(['requisicoes.atender']);
    expect(component.visoesDisponiveis).toEqual(['para_atender', 'todas']);
    component.ngOnInit();
    expect(component.visao).toBe('para_atender');
    expect(api.listar).toHaveBeenCalledWith(jasmine.objectContaining({ visao: 'para_atender' }));
  });

  it('usuario sem direitos nao ganha abas de Requisicoes', () => {
    permissoes([]);
    expect(component.podeEditar).toBeFalse();
    expect(component.podeAprovar).toBeFalse();
    expect(component.podeAtender).toBeFalse();
  });

  it('exibe semaforo e vinculos do item na tela de requisicao', () => {
    permissoes(['requisicoes.atender']);
    component.atual = { id: 1, numero: 10, empresa: 1, loja: 1, setor: 1, requisitante: 1, data_requisicao: '2026-08-21', data_necessaria: null, prioridade: 'NORMAL', justificativa: '', observacoes: '', status: 'APROVADA' } as any;
    component.itens = [{
      id: 5,
      requisicao: 1,
      tipo: 'MATERIAL',
      origem: 'PRODUTO',
      produto: 8,
      produto_descricao: 'Caneta azul',
      descricao: '',
      categoria: '',
      categoria_material: null,
      finalidade: 'USO_CONSUMO',
      finalidade_aquisicao: null,
      unidade: 1,
      especificacao_tecnica: '',
      titulo_servico: '',
      descricao_servico: '',
      categoria_servico: null,
      tipo_servico: '',
      qtd_solicitada: '5.000',
      qtd_atendida: '0.000',
      qtd_pendente: '5.000',
      status: 'APROVADO',
      observacoes: '',
      indicador_compra: {
        cor: 'AMARELO',
        codigo: 'EM_PROCESSO_COMPRA',
        label: 'Em processo de compra',
        estoque_atual: '0.000',
        qtd_pendente_compra: '5.000',
        cotacoes: [{ id: 7, numero: 3, status: 'ABERTA' }],
        pedidos: [{ id: 9, numero: 9, status: 'AB' }],
      },
    }];
    component.view = 'form';
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Em processo de compra');
    expect(text).toContain('Cotação 3 / Pedido 9');
    expect(component.indicadorClass(component.itens[0])).toBe('inactive');
  });

  it('exibe identificacao com numero e status e itens na tela principal', () => {
    permissoes(['requisicoes.fazer']);
    component.atual = { id: 1, numero: 10, empresa: 1, loja: 1, setor: 1, requisitante: 1, data_requisicao: '2026-08-21', data_necessaria: null, prioridade: 'NORMAL', justificativa: '', observacoes: '', status: 'RASCUNHO' } as any;
    component.itens = [itemBase()];
    component.view = 'form';
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Requisição 10 — Não enviada');
    expect(text).toContain('Caneta azul');
    expect(text).not.toContain('Itens da Requisição');
  });

  it('mostra somente Atender quando disponibilidade e suficiente', () => {
    permissoes(['requisicoes.atender']);
    component.atual = { id: 1, status: 'APROVADA' } as any;
    const item = itemBase({ indicador_compra: { codigo: 'DISPONIVEL', estoque_atual: '5.000', cotacoes: [], pedidos: [] } });

    expect(component.podeAtenderItem(item)).toBeTrue();
    expect(component.podeAguardarCotacao(item)).toBeFalse();
  });

  it('mostra somente Aguardar Cotacao quando sem estoque e sem compra', () => {
    permissoes(['requisicoes.atender']);
    component.atual = { id: 1, status: 'APROVADA' } as any;
    const item = itemBase({ indicador_compra: { codigo: 'SEM_ESTOQUE', estoque_atual: '0.000', cotacoes: [], pedidos: [] } });

    expect(component.podeAtenderItem(item)).toBeFalse();
    expect(component.podeAguardarCotacao(item)).toBeTrue();
  });

  it('nao mostra Aguardar Cotacao quando ja existe cotacao ou pedido', () => {
    permissoes(['requisicoes.atender']);
    component.atual = { id: 1, status: 'APROVADA' } as any;
    const item = itemBase({ indicador_compra: { codigo: 'EM_PROCESSO_COMPRA', estoque_atual: '0.000', cotacoes: [{ id: 7 }], pedidos: [{ id: 9 }] } });

    expect(component.podeAtenderItem(item)).toBeFalse();
    expect(component.podeAguardarCotacao(item)).toBeFalse();
    expect(component.indicadorLinks(item)).toContain('Cotação');
    expect(component.indicadorLinks(item)).toContain('Pedido');
  });

  it('nao mostra acoes para item atendido cancelado ou rejeitado', () => {
    permissoes(['requisicoes.atender']);
    component.atual = { id: 1, status: 'APROVADA' } as any;

    ['ATENDIDO', 'CANCELADO', 'REJEITADO'].forEach(status => {
      const item = itemBase({ status, indicador_compra: { codigo: 'DISPONIVEL', estoque_atual: '5.000', cotacoes: [], pedidos: [] } });
      expect(component.podeAtenderItem(item)).toBeFalse();
      expect(component.podeAguardarCotacao(item)).toBeFalse();
    });
  });
});

function itemBase(overrides: Partial<any> = {}): any {
  return {
    id: 5,
    requisicao: 1,
    tipo: 'MATERIAL',
    origem: 'PRODUTO',
    produto: 8,
    produto_descricao: 'Caneta azul',
    descricao: '',
    categoria: '',
    categoria_material: null,
    finalidade: 'USO_CONSUMO',
    finalidade_aquisicao: null,
    unidade: 1,
    especificacao_tecnica: '',
    titulo_servico: '',
    descricao_servico: '',
    categoria_servico: null,
    tipo_servico: '',
    qtd_solicitada: '5.000',
    qtd_atendida: '0.000',
    qtd_pendente: '5.000',
    status: 'APROVADO',
    observacoes: '',
    ...overrides,
  };
}
