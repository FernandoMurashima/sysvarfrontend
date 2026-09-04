import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { RecebimentoMercadoriaService } from '../../core/services/recebimento-mercadoria.service';
import { RecebimentoMercadoriaDetalheComponent } from './recebimento-mercadoria-detalhe.component';

describe('RecebimentoMercadoriaDetalheComponent', () => {
  let fixture: ComponentFixture<RecebimentoMercadoriaDetalheComponent>;
  let component: RecebimentoMercadoriaDetalheComponent;
  let api: jasmine.SpyObj<RecebimentoMercadoriaService>;

  const pedido1 = { id: 1, emissao: '2026-09-01', fornecedor_nome: 'Fornecedor A', loja_nome: 'Loja A', quantidade: '2.000', valor: '10.00', status: 'AP', status_label: 'Aprovado' } as any;
  const pedido2 = { id: 2, emissao: '2026-09-02', fornecedor_nome: 'Fornecedor A', loja_nome: 'Loja A', quantidade: '3.000', valor: '15.00', status: 'AT', status_label: 'Atendido' } as any;
  const conferenciaItem = {
    id: 10,
    recebimento: 8,
    pedido: 1,
    pedido_item: 20,
    produto: 30,
    produto_referencia: 'REF001',
    produto_descricao: 'Camiseta',
    cor: 40,
    cor_nome: 'Azul',
    tamanho: 50,
    tamanho_nome: 'M',
    produto_detalhe: 60,
    ean: '',
    quantidade_esperada: '4.000',
    quantidade_recebida: '3.000',
    diferenca: '-1.000',
    situacao: 'FALTA',
  } as any;
  const conferenciaItem2 = {
    ...conferenciaItem,
    id: 11,
    produto_referencia: 'REF002',
    produto_descricao: 'Bermuda',
    cor_nome: 'Preto',
    tamanho_nome: 'G',
    ean: '7892701001577',
    quantidade_esperada: '2.000',
    quantidade_recebida: '0',
  } as any;
  const recebimento = {
    id: 8,
    loja_nome: 'Loja A',
    fornecedor_nome: 'Fornecedor A',
    status: 'ABERTO',
    status_label: 'Aberto',
    criado_em: '2026-09-04T09:00:00-03:00',
    xml_fornecedor_dados: { numero: '123', serie: '1', chave_acesso: '35260822345678000195550010000001234567890121', valor_total: '25.00', quantidade_total_faturada: '5.000', unidade_comercial: 'UN' },
    pedidos: [pedido1],
    conferencia_itens: [],
    conferencia_resumo: {
      quantidade_esperada_total: '0',
      quantidade_recebida_total: '0',
      diferenca_total: '0',
      quantidade_pedido_total: '2.000',
      quantidade_nfe_total: null,
      quantidade_fisica_total: '0',
      diferenca_nfe_pedido: null,
      diferenca_fisico_nfe: null,
      diferenca_fisico_pedido: '-2.000',
      quantidade_skus: 0,
      quantidade_skus_com_divergencia: 0,
    },
  } as any;
  const termo = {
    id: 7,
    encerrado_em: '2026-09-04T12:00:00-03:00',
    encerrado_por_nome: 'Conferente',
    observacao_divergencia: 'Conferido com divergência.',
    possui_divergencia: true,
    hash_sha256: 'a'.repeat(64),
    criado_em: '2026-09-04T12:00:00-03:00',
    snapshot: {
      recebimento: { id: 8, encerrado_em: '2026-09-04T12:00:00-03:00' },
      xml_nfe: { numero: '123', serie: '1', fornecedor: 'Fornecedor A' },
      estabelecimento: { nome: 'Loja A' },
      totais: { quantidade_pedido_total: '4.000', quantidade_nfe_total: '5.000', quantidade_fisica_total: '4.000', diferenca_fisico_nfe: '-1.000', diferenca_fisico_pedido: '0.000' },
      contagem_operacional: { quantidade_pedidos_vinculados: 1, quantidade_referencias_distintas: 1, quantidade_skus_total_conferencia: 1 },
      divergencias: { faltas: [{ referencia: 'REF001' }], sobras: [] },
      conferencia_sku: [{ referencia: 'REF001', produto: 'Camiseta', cor: 'Azul', tamanho: 'M', ean: '789', esperado: '4.000', recebido: '4.000', diferenca: '0.000' }],
    },
  } as any;

  beforeEach(async () => {
    api = jasmine.createSpyObj<RecebimentoMercadoriaService>('RecebimentoMercadoriaService', ['get', 'pedidosElegiveis', 'vincularPedidos', 'gerarConferencia', 'salvarConferencia', 'encerrarConferencia']);
    api.get.and.returnValue(of(recebimento));
    api.pedidosElegiveis.and.returnValue(of([pedido1, pedido2]));
    api.vincularPedidos.and.returnValue(of({ ...recebimento, pedidos: [pedido1, pedido2] }));
    api.gerarConferencia.and.returnValue(of({
      ...recebimento,
      status: 'EM_CONFERENCIA',
      status_label: 'Em conferência',
      conferencia_itens: [conferenciaItem],
      conferencia_resumo: {
        quantidade_esperada_total: '4.000',
        quantidade_recebida_total: '3.000',
        diferenca_total: '-1.000',
        quantidade_pedido_total: '4.000',
        quantidade_nfe_total: '5.000',
        quantidade_fisica_total: '3.000',
        diferenca_nfe_pedido: '1.000',
        diferenca_fisico_nfe: '-2.000',
        diferenca_fisico_pedido: '-1.000',
        quantidade_skus: 1,
        quantidade_skus_com_divergencia: 1,
      },
    }));
    api.salvarConferencia.and.returnValue(of({
      ...recebimento,
      conferencia_itens: [{ ...conferenciaItem, quantidade_recebida: '4.000', diferenca: '0.000', situacao: 'OK' }],
      conferencia_resumo: {
        quantidade_esperada_total: '4.000',
        quantidade_recebida_total: '4.000',
        diferenca_total: '0.000',
        quantidade_pedido_total: '4.000',
        quantidade_nfe_total: '5.000',
        quantidade_fisica_total: '4.000',
        diferenca_nfe_pedido: '1.000',
        diferenca_fisico_nfe: '-1.000',
        diferenca_fisico_pedido: '0.000',
        quantidade_skus: 1,
        quantidade_skus_com_divergencia: 0,
      },
    }));
    api.encerrarConferencia.and.returnValue(of({
      ...recebimento,
      status: 'CONCLUIDO',
      status_label: 'Concluído',
      conferencia_itens: [{ ...conferenciaItem, quantidade_recebida: '4.000', diferenca: '0.000', situacao: 'OK' }],
      termo_encerramento: termo,
      pode_encerrar_conferencia: false,
    }));

    await TestBed.configureTestingModule({
      imports: [RecebimentoMercadoriaDetalheComponent],
      providers: [
        { provide: RecebimentoMercadoriaService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '8' } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecebimentoMercadoriaDetalheComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exibe detalhe e pedidos vinculados sem confirmar estoque', () => {
    const text = fixture.nativeElement.textContent;
    expect(api.get).toHaveBeenCalledWith(8);
    expect(text).toContain('Recebimento #8');
    expect(text).toContain('Fornecedor A');
    expect(text).toContain('Loja A');
    expect(text).toContain('123 / 1');
    expect(text).not.toContain('Confirmar estoque');
    expect(text).toContain('Conferência física ainda não gerada.');
    expect(text).toContain('Qtd pedido');
    expect(text).toContain('2.000');
    expect(text).toContain('Qtd NF-e');
    expect(text).toContain('Qtd física');
    expect(text).toContain('Gerar conferência');
    expect(text).not.toContain('Referência');
    expect(text).not.toContain('REF001');
  });

  it('carrega pedidos elegiveis, permite selecao multipla e salva vinculos', () => {
    component.abrirPedidos();
    component.togglePedido(pedido2, true);
    component.salvarPedidos();

    expect(api.pedidosElegiveis).toHaveBeenCalledWith(8);
    expect(api.vincularPedidos).toHaveBeenCalledWith(8, [1, 2]);
    expect(component.recebimento?.pedidos.length).toBe(2);
  });

  it('exibe erro de API ao buscar pedidos elegiveis', () => {
    api.pedidosElegiveis.and.returnValue(throwError(() => ({ status: 500 })));
    component.abrirPedidos();

    expect(component.errorMsg).toBe('Não foi possível carregar os pedidos elegíveis.');
  });

  it('gera conferencia e mantem grade fora da pagina principal', () => {
    component.gerarConferencia();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(api.gerarConferencia).toHaveBeenCalledWith(8);
    expect(text).toContain('Qtd pedido');
    expect(text).toContain('Qtd NF-e');
    expect(text).toContain('Qtd física');
    expect(text).toContain('Abrir conferência');
    expect(text).not.toContain('Referência');
    expect(text).not.toContain('REF001');
  });

  it('abre modal grande com grade de conferencia e nfe apenas no resumo', () => {
    component.gerarConferencia();
    fixture.detectChanges();
    component.abrirConferencia();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');
    const modalCard = fixture.nativeElement.querySelector('.conference-modal-card');

    expect(component.modalConferenciaAberto).toBeTrue();
    expect(backdrop).withContext('modal de conferencia deve renderizar backdrop').not.toBeNull();
    expect(modalCard).withContext('modal de conferencia deve manter card dedicado').not.toBeNull();
    expect(backdrop?.contains(modalCard)).toBeTrue();
    expect(text).toContain('Conferência física — Recebimento #8');
    expect(text).toContain('NF-e: 5.000');
    expect(text).toContain('Referência');
    expect(text).toContain('REF001');
    expect(text).toContain('Camiseta');
    expect(text).toContain('Azul');
    expect(text).toContain('M');
    expect(text).toContain('Falta');
    expect(fixture.nativeElement.querySelectorAll('.conference-table th').length).toBe(8);
  });

  it('abrir modal da foco no campo EAN e mantem tabela dentro da sobretela', fakeAsync(() => {
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2 }] };
    component.abrirConferencia();
    fixture.detectChanges();
    tick();

    const input = fixture.nativeElement.querySelector('.scan-input input') as HTMLInputElement;
    const modalTable = fixture.nativeElement.querySelector('.conference-modal-card .conference-modal-table');
    expect(document.activeElement).toBe(input);
    expect(modalTable).not.toBeNull();
  }));

  it('EAN valido incrementa exatamente 1, limpa campo, retorna foco e exibe ultima leitura', fakeAsync(() => {
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2 }] };
    component.abrirConferencia();
    fixture.detectChanges();
    tick();

    component.eanBipagem = ' 7892701001577 ';
    component.processarBipagem();
    fixture.detectChanges();
    tick();

    expect(component.recebimento!.conferencia_itens[0].quantidade_recebida).toBe('1');
    expect(component.eanBipagem).toBe('');
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.scan-input input'));
    expect(fixture.nativeElement.textContent).toContain('Última leitura');
    expect(fixture.nativeElement.textContent).toContain('REF002');
    tick(2200);
  }));

  it('dois bips incrementam 2 e quantidade igual ao esperado fica OK', fakeAsync(() => {
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2 }] };
    component.abrirConferencia();
    fixture.detectChanges();

    component.eanBipagem = '7892701001577';
    component.processarBipagem();
    component.eanBipagem = '7892701001577';
    component.processarBipagem();
    fixture.detectChanges();

    expect(component.recebimento!.conferencia_itens[0].quantidade_recebida).toBe('2');
    expect(component.diferenca(component.recebimento!.conferencia_itens[0])).toBe(0);
    expect(component.situacaoDiferenca(component.recebimento!.conferencia_itens[0])).toBe('OK');
    expect(component.ultimaLeitura?.situacao).toBe('OK');
    tick(2200);
  }));

  it('bip alem do esperado gera Sobra', fakeAsync(() => {
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2, quantidade_recebida: '2' }] };
    component.eanBipagem = '7892701001577';
    component.processarBipagem();

    expect(component.recebimento!.conferencia_itens[0].quantidade_recebida).toBe('3');
    expect(component.situacaoDiferenca(component.recebimento!.conferencia_itens[0])).toBe('Sobra');
    expect(component.ultimaLeitura?.status).toBe('sobra');
    tick(2200);
  }));

  it('EAN inexistente nao altera quantidade', fakeAsync(() => {
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2 }] };
    component.eanBipagem = '0000000000000';
    component.processarBipagem();

    expect(component.recebimento!.conferencia_itens[0].quantidade_recebida).toBe('0');
    expect(component.ultimaLeitura?.mensagem).toBe('EAN não pertence a este recebimento.');
    expect(api.salvarConferencia).not.toHaveBeenCalled();
    tick();
  }));

  it('EAN duplicado nao altera quantidade', fakeAsync(() => {
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2 }, { ...conferenciaItem2, id: 12 }] };
    component.eanBipagem = '7892701001577';
    component.processarBipagem();

    expect(component.recebimento!.conferencia_itens[0].quantidade_recebida).toBe('0');
    expect(component.recebimento!.conferencia_itens[1].quantidade_recebida).toBe('0');
    expect(component.ultimaLeitura?.mensagem).toBe('EAN duplicado/ambíguo na conferência.');
    expect(api.salvarConferencia).not.toHaveBeenCalled();
    tick();
  }));

  it('edicao manual continua funcionando e dispara autosave apos debounce', fakeAsync(() => {
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2, quantidade_recebida: '1' }] };
    component.recebimento!.conferencia_itens[0].quantidade_recebida = '2';
    component.registrarEdicaoManual();

    expect(component.diferenca(component.recebimento!.conferencia_itens[0])).toBe(0);
    expect(api.salvarConferencia).not.toHaveBeenCalled();
    tick(700);

    expect(api.salvarConferencia).toHaveBeenCalledWith(8, [{ id: 11, quantidade_recebida: '2' }]);
  }));

  it('salva imediatamente ao atingir 20 alteracoes', fakeAsync(() => {
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2 }] };
    for (let i = 0; i < 20; i += 1) {
      component.eanBipagem = '7892701001577';
      component.processarBipagem();
    }

    expect(api.salvarConferencia).toHaveBeenCalledTimes(1);
    expect(api.salvarConferencia.calls.mostRecent().args[1]).toEqual([{ id: 11, quantidade_recebida: '20' }]);
    tick(2200);
  }));

  it('nao dispara saves simultaneos', fakeAsync(() => {
    const primeiraResposta = new Subject<any>();
    api.salvarConferencia.and.returnValues(
      primeiraResposta.asObservable(),
      of({ ...recebimento, conferencia_itens: [{ ...conferenciaItem2, quantidade_recebida: '2' }] }),
    );
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2 }] };

    component.eanBipagem = '7892701001577';
    component.processarBipagem();
    tick(700);
    component.eanBipagem = '7892701001577';
    component.processarBipagem();

    expect(api.salvarConferencia).toHaveBeenCalledTimes(1);
    tick(700);
    expect(api.salvarConferencia).toHaveBeenCalledTimes(1);
    primeiraResposta.next({ ...recebimento, conferencia_itens: [{ ...conferenciaItem2, quantidade_recebida: '1' }] });
    primeiraResposta.complete();
    tick();
    expect(api.salvarConferencia).toHaveBeenCalledTimes(2);
    tick(2200);
  }));

  it('erro de autosave preserva quantidades locais', fakeAsync(() => {
    api.salvarConferencia.and.returnValue(throwError(() => ({ status: 500 })));
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2 }] };

    component.eanBipagem = '7892701001577';
    component.processarBipagem();
    tick(700);

    expect(component.recebimento!.conferencia_itens[0].quantidade_recebida).toBe('1');
    expect(component.errorMsg).toBe('Não foi possível salvar automaticamente a conferência.');
    tick(1500);
  }));

  it('fechar com pendencia salva antes e erro ao salvar impede fechar', fakeAsync(() => {
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2 }] };
    component.abrirConferencia();
    component.eanBipagem = '7892701001577';
    component.processarBipagem();
    component.fecharConferencia();

    expect(api.salvarConferencia).toHaveBeenCalled();
    expect(component.modalConferenciaAberto).toBeFalse();

    api.salvarConferencia.calls.reset();
    api.salvarConferencia.and.returnValue(throwError(() => ({ status: 500 })));
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2 }] };
    component.abrirConferencia();
    component.eanBipagem = '7892701001577';
    component.processarBipagem();
    component.fecharConferencia();

    expect(component.modalConferenciaAberto).toBeTrue();
    expect(component.errorMsg).toBe('Não foi possível salvar automaticamente a conferência.');
    tick(2200);
  }));

  it('salvar manualmente continua funcionando sem esperar debounce', () => {
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem2, quantidade_recebida: '1' }] };
    component.salvarConferencia();

    expect(api.salvarConferencia).toHaveBeenCalledWith(8, [{ id: 11, quantidade_recebida: '1' }]);
  });

  it('resumo fisico atualiza imediatamente', fakeAsync(() => {
    component.recebimento = {
      ...recebimento,
      conferencia_itens: [{ ...conferenciaItem2 }],
      conferencia_resumo: { ...recebimento.conferencia_resumo, quantidade_pedido_total: '2.000', quantidade_nfe_total: '3.000' },
    };
    component.eanBipagem = '7892701001577';
    component.processarBipagem();

    expect(component.valorResumo('quantidade_fisica_total')).toBe('1');
    expect(component.valorResumo('diferenca_fisico_pedido')).toBe('-1');
    expect(component.valorResumo('diferenca_fisico_nfe')).toBe('-2');
    expect(component.recebimento!.conferencia_resumo.quantidade_skus_com_divergencia).toBe(1);
    tick(2200);
  }));

  it('botao Encerrar aparece em EM_CONFERENCIA, abre modal e exibe resumo', () => {
    component.recebimento = {
      ...recebimento,
      status: 'EM_CONFERENCIA',
      pode_encerrar_conferencia: true,
      conferencia_itens: [{ ...conferenciaItem, quantidade_recebida: '4.000' }],
      conferencia_resumo: { ...recebimento.conferencia_resumo, quantidade_pedido_total: '4.000', quantidade_nfe_total: '5.000', quantidade_fisica_total: '4.000', diferenca_fisico_nfe: '-1.000', diferenca_fisico_pedido: '0.000', quantidade_skus: 1, quantidade_skus_com_divergencia: 0 },
    };
    component.abrirConferencia();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Encerrar conferência');
    component.abrirEncerramento();
    fixture.detectChanges();

    expect(component.modalEncerramentoAberto).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Após o encerramento');
    expect(fixture.nativeElement.textContent).toContain('Pedidos vinculados');
  });

  it('divergencia exige justificativa e erro da API nao fecha modal', () => {
    component.recebimento = {
      ...recebimento,
      status: 'EM_CONFERENCIA',
      pode_encerrar_conferencia: true,
      conferencia_itens: [{ ...conferenciaItem, quantidade_recebida: '3.000' }],
      conferencia_resumo: { ...recebimento.conferencia_resumo, quantidade_pedido_total: '4.000', quantidade_nfe_total: '5.000', quantidade_fisica_total: '3.000', diferenca_fisico_nfe: '-2.000', diferenca_fisico_pedido: '-1.000', quantidade_skus: 1, quantidade_skus_com_divergencia: 1 },
    };
    component.modalEncerramentoAberto = true;
    component.confirmarEncerramento();

    expect(component.encerramentoErrorMsg).toBe('Informe a justificativa da divergência antes de encerrar o recebimento.');
    expect(api.encerrarConferencia).not.toHaveBeenCalled();

    api.encerrarConferencia.and.returnValue(throwError(() => ({ error: { detail: 'Falha' } })));
    component.observacaoDivergencia = 'Divergência conferida.';
    component.confirmarEncerramento();

    expect(component.modalEncerramentoAberto).toBeTrue();
    expect(component.encerramentoErrorMsg).toBe('Falha');
  });

  it('sem divergencia permite encerrar sem justificativa e chama endpoint', () => {
    component.recebimento = {
      ...recebimento,
      status: 'EM_CONFERENCIA',
      pode_encerrar_conferencia: true,
      conferencia_itens: [{ ...conferenciaItem, quantidade_recebida: '4.000' }],
      conferencia_resumo: { ...recebimento.conferencia_resumo, quantidade_pedido_total: '4.000', quantidade_nfe_total: '4.000', quantidade_fisica_total: '4.000', diferenca_fisico_nfe: '0.000', diferenca_fisico_pedido: '0.000', quantidade_skus: 1, quantidade_skus_com_divergencia: 0 },
    };

    component.confirmarEncerramento();

    expect(api.encerrarConferencia).toHaveBeenCalledWith(8, '');
    expect(component.recebimento?.status).toBe('CONCLUIDO');
  });

  it('pendencia e salva antes do encerramento', () => {
    component.recebimento = {
      ...recebimento,
      status: 'EM_CONFERENCIA',
      pode_encerrar_conferencia: true,
      conferencia_itens: [{ ...conferenciaItem2, quantidade_recebida: '1' }],
    };
    component.alteracoesPendentes = 1;

    component.abrirEncerramento();

    expect(api.salvarConferencia).toHaveBeenCalled();
    expect(component.modalEncerramentoAberto).toBeTrue();
  });

  it('apos sucesso status Concluido bloqueia inputs, bipagem e botoes de edicao', () => {
    component.recebimento = {
      ...recebimento,
      status: 'CONCLUIDO',
      status_label: 'Concluído',
      conferencia_itens: [{ ...conferenciaItem, quantidade_recebida: '4.000' }],
      termo_encerramento: termo,
      pode_encerrar_conferencia: false,
    };
    component.abrirConferencia();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ver termo de recebimento');
    expect(fixture.nativeElement.querySelector('.scan-input input')).toBeNull();
    expect(fixture.nativeElement.querySelector('.conference-modal-card .qty-input').classList).toContain('locked');
    expect(fixture.nativeElement.textContent).not.toContain('Salvar conferência');
    expect(fixture.nativeElement.textContent).not.toContain('Encerrar conferência');
  });

  it('termo mostra usuario data hash resumo divergencias linhas SKU e imprime', () => {
    spyOn(window, 'print');
    component.recebimento = {
      ...recebimento,
      status: 'CONCLUIDO',
      termo_encerramento: termo,
      conferencia_itens: [{ ...conferenciaItem }],
    };
    component.abrirTermo();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Termo de Recebimento #7');
    expect(text).toContain('Conferente');
    expect(text).toContain('a'.repeat(64));
    expect(text).toContain('Qtd física');
    expect(text).toContain('Faltas: 1');
    expect(text).toContain('Camiseta');

    component.imprimirTermo();
    expect(window.print).toHaveBeenCalled();
  });

  it('edita recebido, calcula diferenca e salva conferencia', () => {
    component.recebimento = { ...recebimento, conferencia_itens: [{ ...conferenciaItem, quantidade_recebida: '5' }] };
    const item = component.recebimento!.conferencia_itens[0];

    expect(component.diferenca(item)).toBe(1);
    expect(component.situacaoDiferenca(item)).toBe('Sobra');

    component.salvarConferencia();

    expect(api.salvarConferencia).toHaveBeenCalledWith(8, [{ id: 10, quantidade_recebida: '5' }]);
  });

  it('fecha modal de conferencia e mostra nfe sem quantidade como traco', () => {
    component.recebimento = {
      ...recebimento,
      conferencia_itens: [conferenciaItem],
      conferencia_resumo: { ...recebimento.conferencia_resumo, quantidade_nfe_total: null, quantidade_skus: 1 },
    };
    component.abrirConferencia();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('NF-e: -');
    const fecharButton = Array.from(fixture.nativeElement.querySelectorAll('.conference-modal-card .modal-footer .btn'))
      .find((button: any) => button.textContent.includes('Fechar')) as HTMLButtonElement;
    fecharButton.click();
    fixture.detectChanges();

    expect(component.modalConferenciaAberto).toBeFalse();
    expect(fixture.nativeElement.querySelector('.modal-backdrop')).toBeNull();
  });

  it('exibe erro de API ao gerar conferencia', () => {
    api.gerarConferencia.and.returnValue(throwError(() => ({ status: 400 })));
    component.gerarConferencia();

    expect(component.errorMsg).toBe('Não foi possível gerar a conferência física.');
  });
});
