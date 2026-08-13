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
      'bloquearVenda', 'desbloquearVenda', 'gerarSkus', 'inicializarEstoque', 'historico', 'imagens',
      'criarImagem', 'marcarImagemPrincipal', 'removerImagem'
    ]);
    produtosApi.list.and.returnValue(of({ count: 0, results: [], next: null, previous: null }));
    produtosApi.gerarSkus.and.returnValue(of({ counts: {} }));
    produtosApi.historico.and.returnValue(of({ count: 0, results: [] }));
    produtosApi.imagens.and.returnValue(of({ count: 0, results: [] }));
    produtosApi.criarImagem.and.returnValue(of({ id: 1 }));
    produtosApi.marcarImagemPrincipal.and.returnValue(of({ id: 1, principal: true }));
    produtosApi.removerImagem.and.returnValue(of({}));

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

  it('exibe Produto Venda, tipo Fabricação Própria e status dos SKUs', () => {
    skusApi.list.and.returnValue(of({ count: 2, results: [
      { produto: 1, idcor: 1, idtamanho: 1, ean13: '7891', cor_descricao: 'Azul', tamanho_descricao: 'P', ativo: true },
      { produto: 1, idcor: 1, idtamanho: 2, ean13: '7892', cor_descricao: 'Azul', tamanho_descricao: 'M', ativo: false },
    ] }));

    component.editar({
      Idproduto: 1,
      tipo_produto: '3',
      descricao: 'Produto',
      unidade: 1,
      grupo: 1,
      subgrupo: 1,
      colecao: 1,
      grade: 1,
      ncm: '6109.10.00',
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Produto Venda');
    expect(component.tipoProdutoLabel('3')).toBe('Fabricação Própria');
    expect(text).toContain('Ativo');
    expect(text).toContain('Inativo');
    expect(text).toContain('Margem %');
    expect(text).not.toContain('Margem</th>');
  });

  it('envia campos fiscais no payload de edição', () => {
    produtosApi.update.and.returnValue(of({ Idproduto: 1, tipo_produto: '1' } as any));
    component.editingId = 1;
    component.coresSelecionadasIds.set([]);
    component.form.patchValue({
      tipo_produto: '1',
      descricao: 'Produto',
      descricao_reduzida: 'PV',
      unidade: 1,
      grupo: 1,
      subgrupo: 1,
      colecao: 1,
      grade: 1,
      ncm: '6109.10.00',
      origem_mercadoria: 1,
      csosn_ou_cst_icms: '102',
      aliquota_icms: 18,
      cfop_venda_dentro: '5102',
      cfop_venda_fora: '6102',
      cst_pis: '01',
      aliq_pis: 1.65,
      cst_cofins: '01',
      aliq_cofins: 7.6,
      ipi_situacao: '50',
      aliq_ipi: 5,
    });

    component.salvar();

    expect(produtosApi.update).toHaveBeenCalledWith(1, jasmine.objectContaining({
      origem_mercadoria: 1,
      csosn_ou_cst_icms: '102',
      aliquota_icms: 18,
      cfop_venda_dentro: '5102',
      cfop_venda_fora: '6102',
      cst_pis: '01',
      aliq_pis: 1.65,
      cst_cofins: '01',
      aliq_cofins: 7.6,
      ipi_situacao: '50',
      aliq_ipi: 5,
    }));
  });

  it('ação Todas seleciona todas as lojas e permite desmarcar depois', () => {
    component.lojasDisponiveis = [
      { Idloja: 1, nome_loja: 'Loja 1' } as any,
      { Idloja: 2, nome_loja: 'Loja 2' } as any,
    ];

    component.selecionarTodasLojas();
    expect(component.lojasSelecionadasIds()).toEqual([1, 2]);

    component.confirmarLojas([1]);
    expect(component.lojasSelecionadasIds()).toEqual([1]);
  });

  it('galeria permite adicionar, remover, marcar principal e bloqueia quarta imagem', () => {
    component.produtoImagens.set([{ id: 7, imagem_url: 'http://img/1.jpg', principal: true }]);
    component.imagensPendentes.set([
      { file: new File(['1'], '1.jpg'), preview: 'blob:1', principal: false },
      { file: new File(['2'], '2.jpg'), preview: 'blob:2', principal: false },
    ]);

    component.onImagemSelecionada({ target: { files: [new File(['3'], '3.jpg')], value: '' } } as any);
    expect(component.totalImagensSelecionadas()).toBe(3);
    expect(component.errorMsg()).toBe('Limite de 3 imagens por produto.');

    component.marcarPendentePrincipal(1);
    expect(component.imagensPendentes()[1].principal).toBeTrue();
    component.removerImagemPendente(0);
    expect(component.imagensPendentes().length).toBe(1);
  });

  it('consulta sem imagem mostra estado vazio', () => {
    component.consultar({
      Idproduto: 1,
      tipo_produto: '1',
      descricao: 'Produto',
      unidade: 1,
      grupo: 1,
      subgrupo: 1,
      colecao: 1,
      grade: 1,
      ncm: '6109.10.00',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma imagem cadastrada');
  });

  it('mantém fluxo de motivo/senha e mostra erro do backend', () => {
    produtosApi.inativarProduto.and.returnValue(throwError(() => ({ error: { detail: 'Usuário sem permissão.' } })));
    component.segurancaModal = {
      action: 'inativar',
      produto: { Idproduto: 1, tipo_produto: '1', descricao: 'Produto', unidade: 1, grupo: 1, colecao: 1 },
      title: 'Inativar produto',
      motivo: 'Homologacao',
      senha: '123',
    };

    component.confirmarSeguranca();

    expect(produtosApi.inativarProduto).toHaveBeenCalledWith(1, 'Homologacao', '123');
    expect(component.errorMsg()).toBe('Usuário sem permissão.');
  });
});
