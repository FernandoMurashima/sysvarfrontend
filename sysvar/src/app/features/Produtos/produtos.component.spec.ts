import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';

import { ProdutosComponent } from './produtos.component';
import { ProdutosService } from '../../core/services/produtos.service';
import { ColecoesService } from '../../core/services/colecoes.service';
import { GruposService } from '../../core/services/grupos.service';
import { SubgruposService } from '../../core/services/subgrupos.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { GradesService } from '../../core/services/grades.service';
import { NcmsService } from '../../core/services/ncms.service';
import { MateriaisService } from '../../core/services/material.service';
import { TabelaprecoService } from '../../core/services/tabelapreco.service';
import { CoresService } from '../../core/services/cores.service';
import { TabelaprecoProdutoService } from '../../core/services/tabelapreco-produto.service';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutoDetalheService } from '../../core/services/produto-detalhe.service';
import { AuthService } from '../../core/auth.service';
import { FichaTecnicaService } from '../../core/services/ficha-tecnica.service';
import { OrdemProducaoService } from '../../core/services/ordem-producao.service';

describe('ProdutosComponent Produto Venda', () => {
  let fixture: ComponentFixture<ProdutosComponent>;
  let component: ProdutosComponent;
  let produtosApi: jasmine.SpyObj<ProdutosService>;
  let skusApi: jasmine.SpyObj<ProdutoDetalheService>;
  let estoqueApi: jasmine.SpyObj<EstoqueService>;
  let fichaApi: jasmine.SpyObj<FichaTecnicaService>;
  let ordemApi: jasmine.SpyObj<OrdemProducaoService>;

  beforeEach(async () => {
    produtosApi = jasmine.createSpyObj<ProdutosService>('ProdutosService', [
      'list', 'get', 'create', 'update', 'patch', 'remove', 'ativarProduto', 'inativarProduto',
      'bloquearVenda', 'desbloquearVenda', 'gerarSkus', 'inicializarEstoque', 'historico', 'imagens'
    ]);
    produtosApi.list.and.returnValue(of({ count: 0, results: [], next: null, previous: null }));
    produtosApi.gerarSkus.and.returnValue(of({ counts: {} }));
    produtosApi.historico.and.returnValue(of({ count: 0, results: [] }));
    produtosApi.imagens.and.returnValue(of({ count: 0, results: [] }));

    skusApi = jasmine.createSpyObj<ProdutoDetalheService>('ProdutoDetalheService', ['list']);
    skusApi.list.and.returnValue(of({ count: 0, results: [] }));
    estoqueApi = jasmine.createSpyObj<EstoqueService>('EstoqueService', ['list']);
    estoqueApi.list.and.returnValue(of({ count: 0, results: [] }));
    fichaApi = jasmine.createSpyObj<FichaTecnicaService>('FichaTecnicaService', ['list']);
    fichaApi.list.and.returnValue(of({ count: 0, results: [] }));
    ordemApi = jasmine.createSpyObj<OrdemProducaoService>('OrdemProducaoService', ['list']);
    ordemApi.list.and.returnValue(of({ count: 0, results: [] }));

    const listService = { list: jasmine.createSpy('list').and.returnValue(of([])) };
    const pagedListService = { list: jasmine.createSpy('list').and.returnValue(of({ count: 0, results: [] })) };
    const auth = {
      podeAcessarModulo: jasmine.createSpy('podeAcessarModulo').and.returnValue(true),
      podeExcluirModulo: jasmine.createSpy('podeExcluirModulo').and.returnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [ProdutosComponent],
      providers: [
        { provide: ProdutosService, useValue: produtosApi },
        { provide: ColecoesService, useValue: listService },
        { provide: GruposService, useValue: pagedListService },
        { provide: SubgruposService, useValue: pagedListService },
        { provide: UnidadesService, useValue: pagedListService },
        { provide: GradesService, useValue: pagedListService },
        { provide: NcmsService, useValue: listService },
        { provide: MateriaisService, useValue: listService },
        { provide: TabelaprecoService, useValue: listService },
        { provide: CoresService, useValue: listService },
        { provide: TabelaprecoProdutoService, useValue: pagedListService },
        { provide: EstoqueService, useValue: estoqueApi },
        { provide: LojasService, useValue: pagedListService },
        { provide: ProdutoDetalheService, useValue: skusApi },
        { provide: AuthService, useValue: auth },
        { provide: FichaTecnicaService, useValue: fichaApi },
        { provide: OrdemProducaoService, useValue: ordemApi },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProdutosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    produtosApi.list.calls.reset();
  });

  it('envia filtros referencia e codigo separadamente com paginação backend', () => {
    component.search = 'camisa';
    component.filterReferencia = '26-01-01001';
    component.filterCodigo = 'COD15';
    component.page.set(2);
    component.pageSize.set(50);

    component.load();

    expect(produtosApi.list).toHaveBeenCalledWith(jasmine.objectContaining({
      search: 'camisa',
      referencia: '26-01-01001',
      codigo: 'COD15',
      page: 2,
      page_size: 50,
    }));
  });

  it('ao retirar a última cor em edição chama backend com cores vazio', () => {
    component.editingId = 10;
    component.coresSelecionadasIds.set([]);

    (component as any).gerarSkusPosSave(10, '1');

    expect(produtosApi.gerarSkus).toHaveBeenCalledWith(10, []);
  });

  it('mostra detail do backend ao falhar exclusão', () => {
    produtosApi.remove.and.returnValue(throwError(() => ({ error: { detail: 'Produto possui utilização/movimentação operacional.' } })));
    component.excluirModal = { Idproduto: 1, tipo_produto: '1', descricao: 'Produto', unidade: 1, grupo: 1, colecao: 1 };

    component.confirmarExclusao();

    expect(component.errorMsg()).toBe('Produto possui utilização/movimentação operacional.');
  });

  it('consulta permanece readonly, carrega produção e renderiza imagem', () => {
    produtosApi.imagens.and.returnValue(of({ count: 1, results: [{ id: 7, imagem_url: 'http://img/produto.jpg', principal: true }] }));
    skusApi.list.and.returnValue(of({ count: 1, results: [{ produto: 1, idcor: 1, idtamanho: 1, ean13: '7891234000011', cor_descricao: 'Azul', tamanho_descricao: 'P' }] }));
    estoqueApi.list.and.returnValue(of({ count: 1, results: [{ Idestoque: 1, CodigodeBarra: '7891234000011', referencia: '26', Idloja: 1, Estoque: 3, reserva: 1 }] }));
    fichaApi.list.and.returnValue(of({ count: 1, results: [{ id: 1, produto_final: 1, descricao: 'Ficha', versao: '1', status: 'APROVADA', ativa: true } as any] }));
    ordemApi.list.and.returnValue(of({ count: 1, results: [{ id: 2, ficha_tecnica: 1, numero: 'OP1', status: 'ABERTA', quantidade: 1 } as any] }));

    component.consultar({
      Idproduto: 1,
      tipo_produto: '3',
      descricao: 'Produto',
      descricao_reduzida: 'PV',
      unidade: 1,
      grupo: 1,
      subgrupo: 1,
      colecao: 1,
      grade: 1,
      ncm: '6109.10.00',
    });
    fixture.detectChanges();

    expect(component.form.disabled).toBeTrue();
    expect(fichaApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ produto_final: 1 }));
    expect(ordemApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ produto_final: 1 }));
    expect(fixture.nativeElement.querySelector('.product-image-preview img')?.getAttribute('src')).toBe('http://img/produto.jpg');
    expect(fixture.nativeElement.textContent).toContain('Fiscal');
    expect(fixture.nativeElement.textContent).toContain('Estoque por loja');
  });
});
