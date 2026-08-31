import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import * as XLSX from 'xlsx';
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
  let lojasApi: jasmine.SpyObj<LojasService>;
  let produtosApi: jasmine.SpyObj<ProdutosService>;
  let colecoesApi: jasmine.SpyObj<ColecoesService>;
  let skusApi: jasmine.SpyObj<ProdutoDetalheService>;
  let coresApi: jasmine.SpyObj<CoresService>;
  let tamanhosApi: jasmine.SpyObj<TamanhosService>;

  beforeEach(async () => {
    estoqueApi = jasmine.createSpyObj<EstoqueService>('EstoqueService', ['list', 'listMovimentacoes', 'movimentacoesReferencia', 'sugestoesReferencia', 'consultaReferencia', 'consultaColecao']);
    lojasApi = jasmine.createSpyObj<LojasService>('LojasService', ['list']);
    produtosApi = jasmine.createSpyObj<ProdutosService>('ProdutosService', ['list']);
    colecoesApi = jasmine.createSpyObj<ColecoesService>('ColecoesService', ['list']);
    skusApi = jasmine.createSpyObj<ProdutoDetalheService>('ProdutoDetalheService', ['list']);
    coresApi = jasmine.createSpyObj<CoresService>('CoresService', ['list']);
    tamanhosApi = jasmine.createSpyObj<TamanhosService>('TamanhosService', ['list']);

    estoqueApi.list.and.returnValue(of({ count: 0, results: [] }));
    estoqueApi.consultaReferencia.and.returnValue(of({ count: 0, results: [] }));
    estoqueApi.consultaColecao.and.returnValue(of({ count: 0, results: [] }));
    estoqueApi.sugestoesReferencia.and.returnValue(of({ count: 0, results: [] }));
    estoqueApi.movimentacoesReferencia.and.returnValue(of({ count: 1, results: [
      { Idmovimento: 1, Idloja: 1, CodigodeBarra: '7890000000001', referencia: 'REF-A', cor: 'Azul', tamanho: 'M', tipo: 'SAIDA', quantidade: '2.000', saldo_anterior: '8.000', saldo_posterior: '6.000', origem: 'VENDA', data_movimento: '2026-08-25T10:00:00Z' } as any,
      { Idmovimento: 2, Idloja: 1, CodigodeBarra: '7890000000002', referencia: 'REF-A', tipo: 'AJUSTE', quantidade: '1.000', saldo_anterior: '6.000', saldo_posterior: '7.000', origem: '', data_movimento: '2026-08-25T11:00:00Z' } as any
    ] }));
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
    component.movimentoReferenciaSelecionada = 'REF-A';
    component.search = 'REF-A - Produto A';
    component.loja = '2';
    component.tipo = 'SAIDA';
    component.tipoProduto = '3';
    component.dataInicio = '2026-08-24';
    component.dataFim = '2026-08-26';
    component.load();

    expect(estoqueApi.movimentacoesReferencia).toHaveBeenCalledWith(jasmine.objectContaining({
      referencia: 'REF-A',
      loja: '2',
      tipo: 'SAIDA',
      data_inicio: '2026-08-24',
      data_fim: '2026-08-26'
    }));
  });

  it('modo movimentação não carrega dados desnecessários de matriz', () => {
    expect(estoqueApi.list).not.toHaveBeenCalled();
    expect(estoqueApi.consultaReferencia).not.toHaveBeenCalled();
    expect(estoqueApi.consultaColecao).not.toHaveBeenCalled();
    expect(produtosApi.list).not.toHaveBeenCalled();
    expect(colecoesApi.list).not.toHaveBeenCalled();
    expect(coresApi.list).not.toHaveBeenCalled();
    expect(tamanhosApi.list).not.toHaveBeenCalled();
    expect(estoqueApi.movimentacoesReferencia).not.toHaveBeenCalled();
  });

  it('sem referência selecionada não executa consulta geral de movimentações', () => {
    estoqueApi.movimentacoesReferencia.calls.reset();
    component.search = 'REF';
    component.movimentoReferenciaSelecionada = '';

    component.load();

    expect(estoqueApi.movimentacoesReferencia).not.toHaveBeenCalled();
    expect(component.movimentos).toEqual([]);
  });

  it('digitação parcial busca sugestões com debounce e não seleciona automaticamente', fakeAsync(() => {
    estoqueApi.sugestoesReferencia.and.returnValue(of({ count: 1, results: [
      { referencia: '27-01-01003', descricao: 'Calça Jeans Wide Leg Serena', label: '27-01-01003 - Calça Jeans Wide Leg Serena' }
    ] as any }));

    component.onSearchTextChange('cal');
    tick(299);
    expect(estoqueApi.sugestoesReferencia).not.toHaveBeenCalled();

    tick(1);
    expect(estoqueApi.sugestoesReferencia).toHaveBeenCalledWith(jasmine.objectContaining({ search: 'cal', loja: '' }));
    expect(component.movimentoReferenciaSelecionada).toBe('');
    expect(component.searchSuggestions).toContain('27-01-01003 - Calça Jeans Wide Leg Serena');
  }));

  it('selecionar sugestão por descrição grava referência correta e Atualizar filtro usa referência selecionada', () => {
    estoqueApi.movimentacoesReferencia.calls.reset();
    component.movimentoSugestoes = [
      { referencia: '27-01-01003', descricao: 'Calça Jeans Wide Leg Serena', label: '27-01-01003 - Calça Jeans Wide Leg Serena' }
    ];

    component.buscar('27-01-01003 - Calça Jeans Wide Leg Serena');

    expect(component.movimentoReferenciaSelecionada).toBe('27-01-01003');
    expect(estoqueApi.movimentacoesReferencia).toHaveBeenCalledWith(jasmine.objectContaining({ referencia: '27-01-01003' }));
  });

  it('selecionar sugestão por EAN usa a referência do produto', () => {
    estoqueApi.movimentacoesReferencia.calls.reset();
    component.movimentoSugestoes = [
      { referencia: '27-01-01003', descricao: 'Calça Jeans', ean: '7892701000310', label: '27-01-01003 - Calça Jeans - EAN 7892701000310' }
    ];

    component.buscar('27-01-01003 - Calça Jeans - EAN 7892701000310');

    expect(component.movimentoReferenciaSelecionada).toBe('27-01-01003');
    expect(estoqueApi.movimentacoesReferencia).toHaveBeenCalledWith(jasmine.objectContaining({ referencia: '27-01-01003' }));
  });

  it('alteração manual do texto limpa seleção anterior', () => {
    component.movimentoReferenciaSelecionada = '27-01-01003';
    component.movimentoSugestoes = [
      { referencia: '27-01-01003', descricao: 'Calça Jeans', label: '27-01-01003 - Calça Jeans' }
    ];
    component.movimentos = [{ referencia: '27-01-01003' } as any];

    component.onSearchTextChange('vestido');

    expect(component.movimentoReferenciaSelecionada).toBe('');
    expect(component.movimentos).toEqual([]);
  });

  it('preenchimento de sugestão não limpa referência selecionada antes do evento search', () => {
    component.movimentoReferenciaSelecionada = '27-01-01003';
    component.movimentoSugestoes = [
      { referencia: '27-01-01003', descricao: 'Calça Jeans', label: '27-01-01003 - Calça Jeans' }
    ];
    component.movimentos = [{ referencia: '27-01-01003' } as any];

    component.onSearchTextChange('27-01-01003 - Calça Jeans');

    expect(component.movimentoReferenciaSelecionada).toBe('27-01-01003');
    expect(component.movimentos.length).toBe(1);
  });

  it('evento atrasado de sugestões após seleção não limpa referência nem tabela', fakeAsync(() => {
    const sugestoes$ = new Subject<any>();
    estoqueApi.sugestoesReferencia.and.returnValue(sugestoes$);
    component.movimentoSugestoes = [
      { referencia: '27-01-01003', descricao: 'Calça Jeans', label: '27-01-01003 - Calça Jeans' }
    ];
    component.onSearchTextChange('cal');
    tick(300);

    component.buscar('27-01-01003 - Calça Jeans');
    component.movimentos = [{ referencia: '27-01-01003' } as any];
    sugestoes$.next({ count: 1, results: [
      { referencia: '27-01-01003', descricao: 'Calça Jeans', label: '27-01-01003 - Calça Jeans' }
    ] });

    expect(component.movimentoReferenciaSelecionada).toBe('27-01-01003');
    expect(component.movimentos.length).toBe(1);
  }));

  it('resposta antiga de consulta não sobrescreve resultado mais recente', () => {
    const consultaA$ = new Subject<any>();
    const consultaB$ = new Subject<any>();
    estoqueApi.movimentacoesReferencia.and.returnValues(consultaA$, consultaB$);
    component.movimentoReferenciaSelecionada = 'REF-A';

    component.load();
    component.movimentoReferenciaSelecionada = 'REF-B';
    component.load();
    consultaB$.next({ count: 1, results: [{ referencia: 'REF-B', documento: 'B' }] });
    consultaB$.complete();
    consultaA$.next({ count: 1, results: [{ referencia: 'REF-A', documento: 'A' }] });
    consultaA$.complete();

    expect(component.movimentos.map(m => m.referencia)).toEqual(['REF-B']);
  });

  it('tabela permanece preenchida sem nova ação após ticks pendentes', fakeAsync(() => {
    component.movimentoReferenciaSelecionada = 'REF-A';
    component.movimentoSugestoes = [{ referencia: 'REF-A', descricao: 'Produto A', label: 'REF-A - Produto A' }];
    component.buscar('REF-A - Produto A');

    tick(600);

    expect(component.movimentoReferenciaSelecionada).toBe('REF-A');
    expect(component.movimentos.length).toBe(2);
  }));

  it('troca de loja não limpa referência selecionada indevidamente', () => {
    component.movimentoReferenciaSelecionada = 'REF-A';
    component.search = 'REF-A - Produto A';

    component.loja = '2';
    component.onLojaChange();

    expect(component.movimentoReferenciaSelecionada).toBe('REF-A');
    expect(estoqueApi.movimentacoesReferencia).toHaveBeenCalledWith(jasmine.objectContaining({ referencia: 'REF-A', loja: '2' }));
  });

  it('autocomplete não chama endpoint de movimentação por referência sozinho', fakeAsync(() => {
    estoqueApi.movimentacoesReferencia.calls.reset();

    component.onSearchTextChange('cal');
    tick(300);

    expect(estoqueApi.sugestoesReferencia).toHaveBeenCalled();
    expect(estoqueApi.movimentacoesReferencia).not.toHaveBeenCalled();
  }));

  it('fluxo real de digitar selecionar atualizar e processar debounce mantém resultado', fakeAsync(() => {
    const sugestoes$ = new Subject<any>();
    estoqueApi.sugestoesReferencia.and.returnValue(sugestoes$);
    estoqueApi.movimentacoesReferencia.calls.reset();

    component.onSearchTextChange('27-01');
    tick(300);
    sugestoes$.next({ count: 1, results: [
      { referencia: '27-01-01003', descricao: 'Calça Jeans', label: '27-01-01003 - Calça Jeans' }
    ] });
    component.buscar('27-01-01003 - Calça Jeans');
    tick(600);

    expect(component.movimentoReferenciaSelecionada).toBe('27-01-01003');
    expect(component.movimentos.map(m => m.referencia)).toEqual(['REF-A', 'REF-A']);
    expect(estoqueApi.movimentacoesReferencia).not.toHaveBeenCalledWith(jasmine.objectContaining({ referencia: '' }));
  }));

  it('modo Consulta por Referência não carrega movimentações', () => {
    estoqueApi.list.calls.reset();
    estoqueApi.consultaReferencia.calls.reset();
    estoqueApi.listMovimentacoes.calls.reset();
    produtosApi.list.calls.reset();
    colecoesApi.list.calls.reset();
    skusApi.list.calls.reset();

    component.modo = 'matriz';
    component.search = 'REF-A';
    component.load();

    expect(estoqueApi.listMovimentacoes).not.toHaveBeenCalled();
    expect(colecoesApi.list).toHaveBeenCalled();
    expect(estoqueApi.list).not.toHaveBeenCalled();
    expect(estoqueApi.consultaReferencia).toHaveBeenCalledWith(jasmine.objectContaining({ search: 'REF-A', loja: '', saldo: 'todos', colecao: '', tipo_produto: '' }));
    expect(produtosApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ search: 'REF-A', page_size: 500 }));
    expect(skusApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ search: 'REF-A', page_size: 1000 }));
  });

  it('carrega coleções e exibe select com opção todas na consulta por referência', () => {
    component.modo = 'matriz';
    component.colecoes = [
      { Idcolecao: 1, Codigo: '26', Descricao: 'Verão', Estacao: '01' } as any
    ];

    fixture.detectChanges();
    const options = Array.from(fixture.nativeElement.querySelectorAll('select option') as NodeListOf<HTMLOptionElement>).map(option => option.textContent?.trim());

    expect(options).toContain('Todas as coleções');
    expect(options).toContain('26 - Verão');
  });

  it('envia coleção somente ao clicar em Buscar na consulta por referência', () => {
    estoqueApi.consultaReferencia.calls.reset();
    component.modo = 'matriz';
    component.search = 'REF-A';
    component.colecao = '1';

    fixture.detectChanges();
    expect(estoqueApi.consultaReferencia).not.toHaveBeenCalled();

    component.buscar(component.search);

    expect(estoqueApi.consultaReferencia).toHaveBeenCalledWith(jasmine.objectContaining({ colecao: '1' }));
  });

  it('envia filtro Revenda somente ao clicar em Atualizar filtro', () => {
    estoqueApi.consultaReferencia.calls.reset();
    component.modo = 'matriz';
    component.search = 'REF-A';
    component.tipoProduto = '1';

    fixture.detectChanges();
    expect(estoqueApi.consultaReferencia).not.toHaveBeenCalled();

    component.buscar(component.search);

    expect(estoqueApi.consultaReferencia).toHaveBeenCalledWith(jasmine.objectContaining({ tipo_produto: '1' }));
  });

  it('envia filtro Coleção própria somente ao clicar em Atualizar filtro', () => {
    estoqueApi.consultaReferencia.calls.reset();
    component.modo = 'matriz';
    component.search = 'REF-A';
    component.tipoProduto = '3';

    fixture.detectChanges();
    expect(estoqueApi.consultaReferencia).not.toHaveBeenCalled();

    component.buscar(component.search);

    expect(estoqueApi.consultaReferencia).toHaveBeenCalledWith(jasmine.objectContaining({ tipo_produto: '3' }));
  });

  it('não renderiza resultado da consulta por referência sem referência digitada', () => {
    component.modo = 'matriz';
    component.search = '';
    component.tipoProduto = '1';
    component.consultaReferenciaRows = [
      { loja: 1, loja_nome: 'Matriz', ean: '7890000000001', referencia: 'REF-A', cor: 'Azul', tamanho: 'M', fisico: 8, reservado: 2, disponivel: 6 } as any
    ];

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.referencia-grade-table')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Informe uma referência ou EAN');
  });

  it('não exibe filtro Estação na consulta por referência', () => {
    component.modo = 'matriz';
    fixture.detectChanges();

    const inputs = Array.from(fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>).map(el => el.placeholder || el.type);
    expect(inputs).not.toContain('Estação');
  });

  it('modo Coleção/Estação carrega apenas dados necessários e preserva filtros', () => {
    estoqueApi.list.calls.reset();
    estoqueApi.consultaColecao.calls.reset();
    estoqueApi.listMovimentacoes.calls.reset();
    produtosApi.list.calls.reset();
    colecoesApi.list.calls.reset();
    skusApi.list.calls.reset();
    coresApi.list.calls.reset();
    tamanhosApi.list.calls.reset();

    component.modo = 'colecao';
    component.estacao = '01';
    component.loja = '2';
    component.load();

    expect(estoqueApi.listMovimentacoes).not.toHaveBeenCalled();
    expect(skusApi.list).not.toHaveBeenCalled();
    expect(coresApi.list).not.toHaveBeenCalled();
    expect(tamanhosApi.list).not.toHaveBeenCalled();
    expect(colecoesApi.list).toHaveBeenCalled();
    expect(estoqueApi.list).not.toHaveBeenCalled();
    expect(estoqueApi.consultaColecao).toHaveBeenCalledWith(jasmine.objectContaining({ estacao: '01', loja: '2' }));
    expect(produtosApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ ativo: 'true', page_size: 1000 }));
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
    component.modo = 'matriz';
    component.produtos = [
      { Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A' } as any,
      { Idproduto: 2, referencia: 'REF-AB', descricao: 'Produto AB' } as any
    ];

    component.buscar('REF-AB - Produto AB');

    expect(component.search).toBe('REF-AB');
    expect(component.load).toHaveBeenCalled();
  });

  it('filtra sugestões da consulta por referência pela loja selecionada', () => {
    component.modo = 'matriz';
    component.loja = '1';
    component.estoques = [
      { Idloja: 1, referencia: 'REF-LOJA-1', CodigodeBarra: '7891', Estoque: 2, reserva: 0 } as any
    ];
    component.produtos = [
      { Idproduto: 1, referencia: 'REF-LOJA-2', descricao: 'Outra loja' } as any
    ];

    expect(component.searchSuggestions).toContain('REF-LOJA-1');
    expect(component.searchSuggestions).toContain('7891');
    expect(component.searchSuggestions).not.toContain('REF-LOJA-2');
  });

  it('limpa referência incompatível ao trocar loja na consulta por referência', () => {
    estoqueApi.list.and.returnValue(of({ count: 0, results: [] }));
    estoqueApi.consultaReferencia.and.returnValue(of({ count: 0, results: [] }));
    component.modo = 'matriz';
    component.search = 'REF-OUTRA';
    component.loja = '2';

    component.onLojaChange();

    expect(estoqueApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ loja: '2', search: 'REF-OUTRA' }));
    expect(component.search).toBe('');
  });

  it('não carrega lista geral de produtos quando nenhuma referência está selecionada', () => {
    produtosApi.list.calls.reset();
    skusApi.list.calls.reset();
    component.modo = 'matriz';
    component.search = '';

    component.load();

    expect(produtosApi.list).not.toHaveBeenCalled();
    expect(skusApi.list).not.toHaveBeenCalled();
  });

  it('renderiza consulta por referência agrupada por loja e cor com tamanhos em colunas', () => {
    component.modo = 'matriz';
    component.search = 'REF-A';
    component.lojas = [{ id: 1, nome_loja: 'Matriz' } as any];
    component.consultaReferenciaRows = [
      { loja: 1, loja_nome: 'Matriz', ean: '7890000000001', referencia: 'REF-A', cor: 'Azul', tamanho: 'P', tamanho_id: 1, fisico: 8, reservado: 2, disponivel: 6 } as any,
      { loja: 1, loja_nome: 'Matriz', ean: '7890000000002', referencia: 'REF-A', cor: 'Azul', tamanho: 'M', tamanho_id: 2, fisico: 5, reservado: 0, disponivel: 5 } as any
    ];

    (component as any).montarGradeReferencia();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const headers = Array.from(fixture.nativeElement.querySelectorAll('.referencia-grade-table thead th') as NodeListOf<HTMLTableCellElement>).map(el => el.textContent?.trim());
    expect(headers).toEqual(['Referência', 'Loja', 'Cor', 'P', 'M']);
    expect(component.referenciaGradeRows.length).toBe(1);
    expect(text).toContain('REF-A');
    expect(text).toContain('Matriz');
    expect(text).toContain('Azul');
    expect(text).toContain('6');
    expect(text).toContain('5');
    expect(text).toContain('TOTAL');
    expect(text).not.toContain('Físico');
    expect(text).not.toContain('Reservado');
    expect(fixture.nativeElement.querySelector('.matrix-table')).toBeNull();
  });

  it('checkboxes físico e reservado mostram e escondem colunas sem nova consulta', () => {
    component.modo = 'matriz';
    component.search = 'REF-A';
    component.lojas = [{ id: 1, nome_loja: 'Matriz' } as any];
    component.consultaReferenciaRows = [
      { loja: 1, loja_nome: 'Matriz', ean: '7890000000001', referencia: 'REF-A', cor: 'Azul', tamanho: 'M', tamanho_id: 1, fisico: 5, reservado: 1, disponivel: 4 } as any
    ];
    estoqueApi.consultaReferencia.calls.reset();

    (component as any).montarGradeReferencia();
    fixture.detectChanges();
    component.mostrarFisicoReferencia = true;
    component.mostrarReservadoReferencia = true;
    fixture.detectChanges();

    let cellText = fixture.nativeElement.querySelector('.referencia-grade-table tbody td.size-col')?.textContent || '';
    expect(cellText).toContain('D: 4');
    expect(cellText).toContain('F: 5');
    expect(cellText).toContain('R: 1');
    expect(estoqueApi.consultaReferencia).not.toHaveBeenCalled();

    component.mostrarFisicoReferencia = false;
    component.mostrarReservadoReferencia = false;
    fixture.detectChanges();

    cellText = fixture.nativeElement.querySelector('.referencia-grade-table tbody td.size-col')?.textContent || '';
    expect(cellText).toContain('4');
    expect(cellText).not.toContain('F: 5');
    expect(cellText).not.toContain('R: 1');
  });

  it('mantém célula vazia para combinação sem SKU e soma total por tamanho', () => {
    component.modo = 'matriz';
    component.search = 'REF-A';
    component.consultaReferenciaRows = [
      { loja: 1, loja_nome: 'Matriz', ean: '789', referencia: 'REF-A', cor: 'Azul', tamanho: 'P', tamanho_id: 1, fisico: 5, reservado: 1, disponivel: 4 } as any,
      { loja: 1, loja_nome: 'Matriz', ean: '790', referencia: 'REF-A', cor: 'Preto', tamanho: 'M', tamanho_id: 2, fisico: 3, reservado: 0, disponivel: 3 } as any
    ];

    (component as any).montarGradeReferencia();
    fixture.detectChanges();

    const firstRowCells = Array.from(fixture.nativeElement.querySelectorAll('.referencia-grade-table tbody tr:first-child td.size-col') as NodeListOf<HTMLTableCellElement>).map(el => el.textContent?.trim());
    const totalCells = Array.from(fixture.nativeElement.querySelectorAll('.referencia-grade-table tfoot th.size-col') as NodeListOf<HTMLTableCellElement>).map(el => el.textContent?.trim());
    expect(firstRowCells).toEqual(['4', '-']);
    expect(totalCells).toEqual(['4', '3']);
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
    component.consultaColecaoRowsApi = [
      { loja: 1, referencia: 'REF-A', fisico: 5, reservado: 1, disponivel: 4 } as any,
      { loja: 1, referencia: 'REF-B', fisico: 0, reservado: 0, disponivel: 0 } as any,
      { loja: 2, referencia: 'REF-A', fisico: 7, reservado: 0, disponivel: 7 } as any,
      { loja: 1, referencia: 'REF-C', fisico: 9, reservado: 0, disponivel: 9 } as any
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
    component.consultaColecaoRowsApi = [
      { loja: 1, referencia: 'REF-A', fisico: 5, reservado: 0, disponivel: 5 } as any,
      { loja: 1, referencia: 'REF-B', fisico: 7, reservado: 0, disponivel: 7 } as any
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
    component.consultaColecaoRowsApi = [
      { loja: 1, referencia: 'REF-A', fisico: 8, reservado: 2, disponivel: 6 } as any,
      { loja: 2, referencia: 'REF-A', fisico: 3, reservado: 0, disponivel: 3 } as any
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
    component.consultaColecaoRowsApi = [
      { loja: 1, referencia: 'REF-A', fisico: 8, reservado: 2, disponivel: 6 } as any,
      { loja: 2, referencia: 'REF-A', fisico: 3, reservado: 0, disponivel: 3 } as any,
      { loja: 1, referencia: 'REF-B', fisico: 4, reservado: 1, disponivel: 3 } as any,
      { loja: 2, referencia: 'REF-B', fisico: 2, reservado: 1, disponivel: 1 } as any
    ];

    (component as any).montarMatrizColecao();

    expect(component.colecaoTotaisLoja[1]).toEqual({ fisico: 12, reservado: 3, disponivel: 9 });
    expect(component.colecaoTotaisLoja[2]).toEqual({ fisico: 5, reservado: 1, disponivel: 4 });
    expect(component.colecaoTotalGeral).toEqual({ fisico: 17, reservado: 4, disponivel: 13 });
  });

  it('exporta consulta por referência como workbook XLSX real', () => {
    component.modo = 'matriz';
    component.search = 'REF-A';
    component.lojas = [{ id: 1, nome_loja: 'Matriz' } as any];
    component.consultaReferenciaRows = [
      { loja: 1, loja_nome: 'Matriz', ean: '789', referencia: 'REF-A', cor: 'Azul', tamanho: 'P', tamanho_id: 1, fisico: 8, reservado: 2, disponivel: 6 } as any,
      { loja: 1, loja_nome: 'Matriz', ean: '790', referencia: 'REF-A', cor: 'Azul', tamanho: 'M', tamanho_id: 2, fisico: 3, reservado: 1, disponivel: 2 } as any
    ];
    (component as any).montarGradeReferencia();
    const link = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const aoaSpy = spyOn(XLSX.utils, 'aoa_to_sheet').and.callThrough();
    spyOn(document, 'createElement').and.returnValue(link);
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return 'blob:xlsx';
    });
    spyOn(URL, 'revokeObjectURL');

    component.exportarExcel();

    expect(aoaSpy).toHaveBeenCalledWith([
      ['Referência', 'Loja', 'Cor', 'P', 'M'],
      ['REF-A', 'Matriz', 'Azul', 6, 2],
      ['TOTAL', '', '', 6, 2]
    ]);
    expect(link.download).toBe('estoque-referencia.xlsx');
    expect(link.download.endsWith('.csv')).toBeFalse();
    expect(link.click).toHaveBeenCalled();
  });

  it('exporta consulta por coleção estação com colunas de físico reservado e disponível', () => {
    component.modo = 'colecao';
    component.lojas = [{ id: 1, nome_loja: 'Matriz' } as any];
    component.colecoes = [{ Idcolecao: 1, Codigo: '26', Descricao: 'Verão', Estacao: '01' } as any];
    component.produtos = [{ Idproduto: 1, referencia: 'REF-A', descricao: 'Produto A', colecao: 1 } as any];
    component.consultaColecaoRowsApi = [
      { loja: 1, referencia: 'REF-A', produto: 'Produto A', fisico: 5, reservado: 1, disponivel: 4 } as any
    ];
    component.estacao = '01';
    (component as any).montarMatrizColecao();
    const link = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const aoaSpy = spyOn(XLSX.utils, 'aoa_to_sheet').and.callThrough();
    spyOn(document, 'createElement').and.returnValue(link);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:xlsx');
    spyOn(URL, 'revokeObjectURL');

    component.exportarExcel();

    expect(aoaSpy).toHaveBeenCalledWith([
      ['Referencia', 'Produto', 'Matriz Físico', 'Matriz Reservado', 'Matriz Disponível', 'Total Físico', 'Total Reservado', 'Total Disponível'],
      ['REF-A', 'Produto A', 5, 1, 4, 5, 1, 4]
    ]);
    expect(link.download).toBe('estoque-colecao.xlsx');
  });

  it('exporta movimentação por referência quando houver dados na tela', () => {
    component.movimentos = [
      { Idmovimento: 1, Idloja: 1, CodigodeBarra: '7890000000001', referencia: 'REF-A', cor: 'Azul', tamanho: 'M', tipo: 'SAIDA', quantidade: 2, saldo_anterior: 8, saldo_posterior: 6, origem: 'VENDA', data_movimento: '2026-08-25T10:00:00Z' } as any
    ];
    const link = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const aoaSpy = spyOn(XLSX.utils, 'aoa_to_sheet').and.callThrough();
    spyOn(document, 'createElement').and.returnValue(link);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:xlsx');
    spyOn(URL, 'revokeObjectURL');

    component.exportarExcel();

    expect(aoaSpy.calls.mostRecent().args[0][0]).toEqual(['Data', 'Loja', 'Tipo', 'Referência', 'EAN', 'Cor', 'Tamanho', 'Quantidade', 'Saldo anterior', 'Saldo posterior', 'Origem', 'Documento', 'Observação']);
    expect(link.download).toBe('estoque-movimentacao.xlsx');
  });

  it('exibe saldo anterior e posterior vindos da API', () => {
    component.movimentos = [
      { Idmovimento: 1, Idloja: 1, CodigodeBarra: '7890000000001', referencia: 'REF-A', cor: 'Azul', tamanho: 'M', tipo: 'SAIDA', quantidade: 2, saldo_anterior: 8, saldo_posterior: 6, origem: 'VENDA', data_movimento: '2026-08-25T10:00:00Z' } as any
    ];
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Saldo anterior');
    expect(text).toContain('Saldo posterior');
    expect(text).toContain('8');
    expect(text).toContain('6');
  });

  it('exibe origem vinda da API e usa fallback quando não houver origem', () => {
    component.movimentos = [
      { Idmovimento: 1, Idloja: 1, CodigodeBarra: '7890000000001', referencia: 'REF-A', cor: 'Azul', tamanho: 'M', tipo: 'SAIDA', quantidade: 2, saldo_anterior: 8, saldo_posterior: 6, origem: 'VENDA', data_movimento: '2026-08-25T10:00:00Z' } as any,
      { Idmovimento: 2, Idloja: 1, CodigodeBarra: '7890000000002', referencia: 'REF-A', tipo: 'AJUSTE', quantidade: 1, saldo_anterior: 6, saldo_posterior: 7, origem: '', data_movimento: '2026-08-25T11:00:00Z' } as any
    ];
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    const origemCells = Array.from(fixture.nativeElement.querySelectorAll('tbody tr td:nth-child(11)') as NodeListOf<HTMLTableCellElement>).map(el => el.textContent?.trim());

    expect(text).toContain('Origem');
    expect(origemCells).toEqual(['Venda', '-']);
  });

  it('exibe cor e tamanho vindos da API e usa fallback quando vazio', () => {
    component.movimentos = [
      { Idmovimento: 1, Idloja: 1, CodigodeBarra: '7890000000001', referencia: 'REF-A', cor: 'Azul', tamanho: 'M', tipo: 'SAIDA', quantidade: 2, saldo_anterior: 8, saldo_posterior: 6, origem: 'VENDA', data_movimento: '2026-08-25T10:00:00Z' } as any,
      { Idmovimento: 2, Idloja: 1, CodigodeBarra: '7890000000002', referencia: 'REF-A', tipo: 'AJUSTE', quantidade: 1, saldo_anterior: 6, saldo_posterior: 7, origem: '', data_movimento: '2026-08-25T11:00:00Z' } as any
    ];
    fixture.detectChanges();
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
    component.movimentoReferenciaSelecionada = 'REF-A';
    component.movimentoSugestoes = [{ referencia: 'REF-A', descricao: 'Produto A', label: 'REF-A - Produto A' }];
    component.loja = '2';
    component.tipo = 'SAIDA';
    component.dataInicio = '2026-08-24';
    component.dataFim = '2026-08-26';
    component.colecao = '26';
    component.estacao = '01';
    component.filtroSaldo = 'com_saldo';

    component.clearFilters();

    expect(component.search).toBe('');
    expect(component.movimentoReferenciaSelecionada).toBe('');
    expect(component.movimentoSugestoes).toEqual([]);
    expect(component.loja).toBe('');
    expect(component.tipo).toBe('');
    expect(component.tipoProduto).toBe('');
    expect(component.dataInicio).toBe('');
    expect(component.dataFim).toBe('');
    expect(component.colecao).toBe('');
    expect(component.estacao).toBe('');
    expect(component.filtroSaldo).toBe('todos');
    expect(estoqueApi.movimentacoesReferencia).not.toHaveBeenCalledWith(jasmine.objectContaining({ referencia: '' }));
  });
});
