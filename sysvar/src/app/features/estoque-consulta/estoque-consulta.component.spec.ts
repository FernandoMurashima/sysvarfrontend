import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ColecoesService } from '../../core/services/colecoes.service';
import { CoresService } from '../../core/services/cores.service';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutoDetalheService } from '../../core/services/produto-detalhe.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { TamanhosService } from '../../core/services/tamanhos.service';
import { EstoqueConsultaComponent } from './estoque-consulta.component';

describe('EstoqueConsultaComponent - movimentação por referência', () => {
  let fixture: ComponentFixture<EstoqueConsultaComponent>;
  let component: EstoqueConsultaComponent;
  let estoqueApi: jasmine.SpyObj<EstoqueService>;

  beforeEach(async () => {
    estoqueApi = jasmine.createSpyObj<EstoqueService>('EstoqueService', ['list', 'listMovimentacoes']);
    const lojasApi = jasmine.createSpyObj<LojasService>('LojasService', ['list']);
    const produtosApi = jasmine.createSpyObj<ProdutosService>('ProdutosService', ['list']);
    const colecoesApi = jasmine.createSpyObj<ColecoesService>('ColecoesService', ['list']);
    const skusApi = jasmine.createSpyObj<ProdutoDetalheService>('ProdutoDetalheService', ['list']);
    const coresApi = jasmine.createSpyObj<CoresService>('CoresService', ['list']);
    const tamanhosApi = jasmine.createSpyObj<TamanhosService>('TamanhosService', ['list']);

    estoqueApi.list.and.returnValue(of({ count: 0, results: [] }));
    estoqueApi.listMovimentacoes.and.returnValue(of({ count: 1, results: [
      { Idmovimento: 1, Idloja: 1, CodigodeBarra: '7890000000001', referencia: 'REF-A', cor: 'Azul', tamanho: 'M', tipo: 'SAIDA', quantidade: '2.000', saldo_anterior: '8.000', saldo_posterior: '6.000', origem: 'VENDA', data_movimento: '2026-08-25T10:00:00Z' } as any,
      { Idmovimento: 2, Idloja: 1, CodigodeBarra: '7890000000002', referencia: 'REF-A', tipo: 'AJUSTE', quantidade: '1.000', saldo_anterior: '6.000', saldo_posterior: '7.000', origem: '', data_movimento: '2026-08-25T11:00:00Z' } as any
    ] }));
    lojasApi.list.and.returnValue(of({ count: 2, results: [
      { id: 1, nome_loja: 'Matriz' } as any,
      { id: 2, nome_loja: 'Filial' } as any
    ] }));
    produtosApi.list.and.returnValue(of({ count: 0, results: [] }));
    colecoesApi.list.and.returnValue(of([]));
    skusApi.list.and.returnValue(of({ count: 0, results: [] }));
    coresApi.list.and.returnValue(of({ count: 0, results: [] }));
    tamanhosApi.list.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [EstoqueConsultaComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { data: of({ modo: 'movimentos' }) } },
        { provide: EstoqueService, useValue: estoqueApi },
        { provide: LojasService, useValue: lojasApi },
        { provide: ProdutosService, useValue: produtosApi },
        { provide: ColecoesService, useValue: colecoesApi },
        { provide: ProdutoDetalheService, useValue: skusApi },
        { provide: CoresService, useValue: coresApi },
        { provide: TamanhosService, useValue: tamanhosApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EstoqueConsultaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exibe apenas filtros aplicáveis da movimentação por referência', () => {
    const text = fixture.nativeElement.textContent;
    const inputs = Array.from(fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>).map(el => el.placeholder || el.type);

    expect(text).toContain('Todos os tipos');
    expect(text).not.toContain('Todos os saldos');
    expect(inputs).not.toContain('Coleção');
    expect(inputs).not.toContain('Estação');
    expect(inputs).toContain('date');
  });

  it('envia filtros de referência loja tipo e datas para o backend', () => {
    component.search = 'REF-A';
    component.loja = '2';
    component.tipo = 'SAIDA';
    component.dataInicio = '2026-08-24';
    component.dataFim = '2026-08-26';
    component.load();

    expect(estoqueApi.listMovimentacoes).toHaveBeenCalledWith(jasmine.objectContaining({
      search: 'REF-A',
      loja: '2',
      tipo: 'SAIDA',
      data_inicio: '2026-08-24',
      data_fim: '2026-08-26'
    }));
  });

  it('mantém referência exata na consulta', () => {
    spyOn(component, 'load');
    component.produtos = [
      { Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A' } as any,
      { Idproduto: 2, referencia: 'REF-AB', descricao: 'Produto AB' } as any
    ];

    component.buscar('REF-A');

    expect(component.search).toBe('REF-A');
    expect(component.load).toHaveBeenCalled();
  });

  it('mantém EAN exato na consulta', () => {
    spyOn(component, 'load');
    component.skus = [
      { ean13: '7890000000001', codigo_item_ref: '00001' } as any,
      { ean13: '7890000000002', codigo_item_ref: '00002' } as any
    ];

    component.buscar('7890000000002');

    expect(component.search).toBe('7890000000002');
    expect(component.load).toHaveBeenCalled();
  });

  it('não escolhe automaticamente a primeira referência semelhante em busca parcial ambígua', () => {
    spyOn(component, 'load');
    component.produtos = [
      { Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A' } as any,
      { Idproduto: 2, referencia: 'REF-AB', descricao: 'Produto AB' } as any
    ];

    component.buscar('REF');

    expect(component.search).toBe('REF');
    expect(component.search).not.toBe('REF-A');
    expect(component.load).toHaveBeenCalled();
  });

  it('usa determinísticamente a referência da sugestão selecionada', () => {
    spyOn(component, 'load');
    component.produtos = [
      { Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A' } as any,
      { Idproduto: 2, referencia: 'REF-AB', descricao: 'Produto AB' } as any
    ];

    component.buscar('REF-AB - Produto AB');

    expect(component.search).toBe('REF-AB');
    expect(component.load).toHaveBeenCalled();
  });

  it('mostra estoque físico reservado e disponível na matriz por loja cor e tamanho', () => {
    component.modo = 'matriz';
    component.search = 'REF-A';
    component.lojas = [{ id: 1, nome_loja: 'Matriz' } as any];
    component.cores = [{ Idcor: 1, Descricao: 'Azul' } as any];
    component.tamanhos = [{ Idtamanho: 1, Tamanho: 'M' } as any];
    component.skus = [{ ean13: '7890000000001', codigo_item_ref: 'REF-A', idcor: 1, idtamanho: 1 } as any];
    component.estoques = [
      { Idestoque: 1, Idloja: 1, CodigodeBarra: '7890000000001', referencia: 'REF-A', Estoque: 8, reserva: 2 } as any
    ];

    (component as any).montarMatrizReferencia();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Físico');
    expect(text).toContain('Reservado');
    expect(text).toContain('Disponível');
    expect(component.matrizSaldo(component.matrizRows[0], 1)).toEqual({ fisico: 8, reservado: 2, disponivel: 6 });
    expect(component.matrizTotalGeral).toEqual({ fisico: 8, reservado: 2, disponivel: 6 });
  });

  it('calcula disponível com reserva zero mantendo a matriz por tamanho', () => {
    component.modo = 'matriz';
    component.search = 'REF-A';
    component.lojas = [{ id: 1, nome_loja: 'Matriz' } as any];
    component.cores = [{ Idcor: 1, Descricao: 'Azul' } as any];
    component.tamanhos = [
      { Idtamanho: 1, Tamanho: 'M' } as any,
      { Idtamanho: 2, Tamanho: 'G' } as any
    ];
    component.skus = [
      { ean13: '7890000000001', codigo_item_ref: 'REF-A', idcor: 1, idtamanho: 1 } as any,
      { ean13: '7890000000002', codigo_item_ref: 'REF-A', idcor: 1, idtamanho: 2 } as any
    ];
    component.estoques = [
      { Idestoque: 1, Idloja: 1, CodigodeBarra: '7890000000001', referencia: 'REF-A', Estoque: 5, reserva: 0 } as any,
      { Idestoque: 2, Idloja: 1, CodigodeBarra: '7890000000002', referencia: 'REF-A', Estoque: 4, reserva: 1 } as any
    ];

    (component as any).montarMatrizReferencia();

    expect(component.matrizTamanhos.map(t => t.label)).toEqual(['G', 'M']);
    expect(component.matrizRows.length).toBe(1);
    expect(component.matrizTotalGeral).toEqual({ fisico: 9, reservado: 1, disponivel: 8 });
  });

  it('filtra coleções pela estação selecionada', () => {
    component.modo = 'colecao';
    component.colecoes = [
      { Idcolecao: 1, Codigo: '26', Descricao: 'Verão', Estacao: '01' } as any,
      { Idcolecao: 2, Codigo: '26', Descricao: 'Inverno', Estacao: '02' } as any
    ];

    component.estacao = '01';

    expect(component.colecoesFiltradas.map(c => c.Idcolecao)).toEqual([1]);
  });

  it('filtra referências pela coleção selecionada', () => {
    component.modo = 'colecao';
    component.estacao = '01';
    component.colecao = '1';
    component.colecoes = [
      { Idcolecao: 1, Codigo: '26', Descricao: 'Verão', Estacao: '01' } as any,
      { Idcolecao: 2, Codigo: '26', Descricao: 'Inverno', Estacao: '02' } as any
    ];
    component.produtos = [
      { Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A', colecao: 1 } as any,
      { Idproduto: 2, referencia: 'REF-B', descricao: 'Produto B', colecao: 2 } as any
    ];

    component.onColecaoChange();

    expect(component.produtosColecao.map(p => p.referencia)).toEqual(['REF-A']);
  });

  it('limpa coleção e referência incompatíveis ao trocar estação', () => {
    component.modo = 'colecao';
    component.estacao = '02';
    component.colecao = '1';
    component.produtoReferencia = 'REF-A';
    component.colecoes = [
      { Idcolecao: 1, Codigo: '26', Descricao: 'Verão', Estacao: '01' } as any,
      { Idcolecao: 2, Codigo: '26', Descricao: 'Inverno', Estacao: '02' } as any
    ];
    component.produtos = [
      { Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A', colecao: 1 } as any,
      { Idproduto: 2, referencia: 'REF-B', descricao: 'Produto B', colecao: 2 } as any
    ];

    component.onEstacaoChange();

    expect(component.colecao).toBe('');
    expect(component.produtoReferencia).toBe('');
    expect(component.produtosColecao.map(p => p.referencia)).toEqual(['REF-B']);
  });

  it('limpa referência incompatível ao trocar coleção', () => {
    component.modo = 'colecao';
    component.estacao = '01';
    component.colecao = '2';
    component.produtoReferencia = 'REF-A';
    component.colecoes = [
      { Idcolecao: 1, Codigo: '26', Descricao: 'Verão A', Estacao: '01' } as any,
      { Idcolecao: 2, Codigo: '26', Descricao: 'Verão B', Estacao: '01' } as any
    ];
    component.produtos = [
      { Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A', colecao: 1 } as any,
      { Idproduto: 2, referencia: 'REF-B', descricao: 'Produto B', colecao: 2 } as any
    ];

    component.onColecaoChange();

    expect(component.produtoReferencia).toBe('');
    expect(component.produtosColecao.map(p => p.referencia)).toEqual(['REF-B']);
  });

  it('monta matriz de coleção com filtros parciais e preserva loja e saldo', () => {
    component.modo = 'colecao';
    component.estacao = '01';
    component.loja = '1';
    component.filtroSaldo = 'com_saldo';
    component.lojas = [
      { id: 1, nome_loja: 'Matriz' } as any,
      { id: 2, nome_loja: 'Filial' } as any
    ];
    component.colecoes = [
      { Idcolecao: 1, Codigo: '26', Descricao: 'Verão A', Estacao: '01' } as any,
      { Idcolecao: 2, Codigo: '26', Descricao: 'Verão B', Estacao: '01' } as any,
      { Idcolecao: 3, Codigo: '26', Descricao: 'Inverno', Estacao: '02' } as any
    ];
    component.produtos = [
      { Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A', colecao: 1 } as any,
      { Idproduto: 2, referencia: 'REF-B', descricao: 'Produto B', colecao: 2 } as any,
      { Idproduto: 3, referencia: 'REF-C', descricao: 'Produto C', colecao: 3 } as any
    ];
    component.estoques = [
      { Idloja: 1, referencia: 'REF-A', Estoque: 5, reserva: 1 } as any,
      { Idloja: 1, referencia: 'REF-B', Estoque: 0, reserva: 0 } as any,
      { Idloja: 2, referencia: 'REF-A', Estoque: 7, reserva: 0 } as any,
      { Idloja: 1, referencia: 'REF-C', Estoque: 9, reserva: 0 } as any
    ];

    (component as any).montarMatrizColecao();

    expect(component.colecaoRows.map(row => row.referencia)).toEqual(['REF-A']);
    expect(component.colecaoLojaIds).toEqual([1]);
    expect(component.colecaoTotalGeral).toEqual({ fisico: 5, reservado: 1, disponivel: 4 });
  });

  it('monta matriz de coleção com estação coleção e referência', () => {
    component.modo = 'colecao';
    component.estacao = '01';
    component.colecao = '1';
    component.produtoReferencia = 'REF-A';
    component.lojas = [{ id: 1, nome_loja: 'Matriz' } as any];
    component.colecoes = [
      { Idcolecao: 1, Codigo: '26', Descricao: 'Verão A', Estacao: '01' } as any,
      { Idcolecao: 2, Codigo: '26', Descricao: 'Verão B', Estacao: '01' } as any
    ];
    component.produtos = [
      { Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A', colecao: 1 } as any,
      { Idproduto: 2, referencia: 'REF-B', descricao: 'Produto B', colecao: 1 } as any
    ];
    component.estoques = [
      { Idloja: 1, referencia: 'REF-A', Estoque: 5, reserva: 0 } as any,
      { Idloja: 1, referencia: 'REF-B', Estoque: 7, reserva: 0 } as any
    ];

    (component as any).montarMatrizColecao();

    expect(component.colecaoRows.map(row => row.referencia)).toEqual(['REF-A']);
    expect(component.colecaoTotalGeral).toEqual({ fisico: 5, reservado: 0, disponivel: 5 });
  });

  it('mostra físico reservado e disponível por referência e loja na matriz de coleção', () => {
    component.modo = 'colecao';
    component.estacao = '01';
    component.colecao = '1';
    component.lojas = [
      { id: 1, nome_loja: 'Matriz' } as any,
      { id: 2, nome_loja: 'Filial' } as any
    ];
    component.colecoes = [{ Idcolecao: 1, Codigo: '26', Descricao: 'Verão', Estacao: '01' } as any];
    component.produtos = [{ Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A', colecao: 1 } as any];
    component.estoques = [
      { Idloja: 1, referencia: 'REF-A', Estoque: 8, reserva: 2 } as any,
      { Idloja: 2, referencia: 'REF-A', Estoque: 3, reserva: 0 } as any
    ];

    (component as any).montarMatrizColecao();
    fixture.detectChanges();

    const row = component.colecaoRows[0];
    expect(component.colecaoSaldo(row, 1)).toEqual({ fisico: 8, reservado: 2, disponivel: 6 });
    expect(component.colecaoSaldo(row, 2)).toEqual({ fisico: 3, reservado: 0, disponivel: 3 });
    expect(row.total).toEqual({ fisico: 11, reservado: 2, disponivel: 9 });
    expect(fixture.nativeElement.textContent).toContain('Físico');
    expect(fixture.nativeElement.textContent).toContain('Reservado');
    expect(fixture.nativeElement.textContent).toContain('Disponível');
  });

  it('calcula totais por loja e total geral na matriz de coleção', () => {
    component.modo = 'colecao';
    component.estacao = '01';
    component.lojas = [
      { id: 1, nome_loja: 'Matriz' } as any,
      { id: 2, nome_loja: 'Filial' } as any
    ];
    component.colecoes = [{ Idcolecao: 1, Codigo: '26', Descricao: 'Verão', Estacao: '01' } as any];
    component.produtos = [
      { Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A', colecao: 1 } as any,
      { Idproduto: 2, referencia: 'REF-B', descricao: 'Produto B', colecao: 1 } as any
    ];
    component.estoques = [
      { Idloja: 1, referencia: 'REF-A', Estoque: 8, reserva: 2 } as any,
      { Idloja: 2, referencia: 'REF-A', Estoque: 3, reserva: 0 } as any,
      { Idloja: 1, referencia: 'REF-B', Estoque: 4, reserva: 1 } as any,
      { Idloja: 2, referencia: 'REF-B', Estoque: 2, reserva: 1 } as any
    ];

    (component as any).montarMatrizColecao();

    expect(component.colecaoTotaisLoja[1]).toEqual({ fisico: 12, reservado: 3, disponivel: 9 });
    expect(component.colecaoTotaisLoja[2]).toEqual({ fisico: 5, reservado: 1, disponivel: 4 });
    expect(component.colecaoTotalGeral).toEqual({ fisico: 17, reservado: 4, disponivel: 13 });
  });

  it('exibe saldo anterior e posterior vindos da API', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Saldo anterior');
    expect(text).toContain('Saldo posterior');
    expect(text).toContain('8');
    expect(text).toContain('6');
  });

  it('exibe origem vinda da API e usa fallback quando não houver origem', () => {
    const text = fixture.nativeElement.textContent;
    const origemCells = Array.from(fixture.nativeElement.querySelectorAll('tbody tr td:nth-child(11)') as NodeListOf<HTMLTableCellElement>).map(el => el.textContent?.trim());

    expect(text).toContain('Origem');
    expect(origemCells).toEqual(['Venda', '-']);
  });

  it('exibe cor e tamanho vindos da API e usa fallback quando vazio', () => {
    const text = fixture.nativeElement.textContent;
    const corCells = Array.from(fixture.nativeElement.querySelectorAll('tbody tr td:nth-child(6)') as NodeListOf<HTMLTableCellElement>).map(el => el.textContent?.trim());
    const tamanhoCells = Array.from(fixture.nativeElement.querySelectorAll('tbody tr td:nth-child(7)') as NodeListOf<HTMLTableCellElement>).map(el => el.textContent?.trim());

    expect(text).toContain('Cor');
    expect(text).toContain('Tamanho');
    expect(corCells).toEqual(['Azul', '-']);
    expect(tamanhoCells).toEqual(['M', '-']);
  });

  it('limpa todos os filtros da movimentação por referência', () => {
    component.search = 'REF-A';
    component.loja = '2';
    component.tipo = 'SAIDA';
    component.dataInicio = '2026-08-24';
    component.dataFim = '2026-08-26';
    component.colecao = '26';
    component.estacao = '01';
    component.filtroSaldo = 'com_saldo';

    component.clearFilters();

    expect(component.search).toBe('');
    expect(component.loja).toBe('');
    expect(component.tipo).toBe('');
    expect(component.dataInicio).toBe('');
    expect(component.dataFim).toBe('');
    expect(component.colecao).toBe('');
    expect(component.estacao).toBe('');
    expect(component.filtroSaldo).toBe('todos');
    expect(estoqueApi.listMovimentacoes).toHaveBeenCalledWith(jasmine.objectContaining({
      search: '',
      loja: '',
      tipo: '',
      data_inicio: '',
      data_fim: ''
    }));
  });
});
