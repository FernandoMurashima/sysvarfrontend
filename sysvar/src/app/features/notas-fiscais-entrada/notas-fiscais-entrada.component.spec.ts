import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { FornecedoresService } from '../../core/services/fornecedores.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { LojasService } from '../../core/services/lojas.service';
import { NotasFiscaisEntradaService } from '../../core/services/notas-fiscais-entrada.service';
import { PedidosCompraService } from '../../core/services/pedidos-compra.service';
import { NotasFiscaisEntradaComponent } from './notas-fiscais-entrada.component';

describe('NotasFiscaisEntradaComponent', () => {
  let fixture: ComponentFixture<NotasFiscaisEntradaComponent>;
  let component: NotasFiscaisEntradaComponent;

  const nota = {
    id: 1,
    empresa: 1,
    loja: 3,
    fornecedor: 4,
    pedido_compra: 10,
    modelo: '55',
    serie: '1',
    numero: '123',
    chave_acesso: '35140130290862000106550010000000011000000016',
    dt_emissao: '2026-01-01',
    dt_entrada: '2026-01-02',
    status: 'AB' as const,
    valor_produtos: '100.00',
    valor_desconto: '0.00',
    valor_frete: '0.00',
    valor_total: '100.00',
    observacoes: '',
  };
  const notaFechada = { ...nota, id: 2, status: 'FE' as const };
  const notaCancelada = { ...nota, id: 3, status: 'CA' as const };
  const itemBase = {
    pedido_item: 101,
    nota_item: 201,
    produto: 1,
    produto_descricao: 'Produto A',
    produto_referencia: 'REF-A',
    cor: null,
    pack: null,
    descricao_livre: null,
    qtd_pedido: '2.000',
    qtd_recebida_outras_notas: '0.000',
    qtd_na_nota: '1.000',
    saldo_total_recebivel: '2.000',
    saldo_pendente: '1.000',
    preco_unit_pedido: '10.0000',
    quantidades_validas: [],
  };
  const itemOutro = {
    ...itemBase,
    pedido_item: 102,
    nota_item: null,
    produto_descricao: 'Produto B',
    produto_referencia: 'REF-B',
  };

  const notasApi = {
    listar: jasmine.createSpy('listar'),
    indicadores: jasmine.createSpy('indicadores'),
    get: jasmine.createSpy('get'),
    criar: jasmine.createSpy('criar'),
    atualizar: jasmine.createSpy('atualizar'),
    fechar: jasmine.createSpy('fechar'),
    cancelar: jasmine.createSpy('cancelar'),
    recusar: jasmine.createSpy('recusar'),
    importarXml: jasmine.createSpy('importarXml'),
    listarItensXml: jasmine.createSpy('listarItensXml'),
    pendenciasXml: jasmine.createSpy('pendenciasXml'),
    conciliarAutomaticamente: jasmine.createSpy('conciliarAutomaticamente'),
    resumoConciliacao: jasmine.createSpy('resumoConciliacao'),
    candidatosItemXml: jasmine.createSpy('candidatosItemXml'),
    conciliarItemXml: jasmine.createSpy('conciliarItemXml'),
    conferirItemXml: jasmine.createSpy('conferirItemXml'),
    conferirItensXml: jasmine.createSpy('conferirItensXml'),
    resumoConferencia: jasmine.createSpy('resumoConferencia'),
    divergenciasXml: jasmine.createSpy('divergenciasXml'),
    resolverDivergenciaXml: jasmine.createSpy('resolverDivergenciaXml'),
    analisarCancelamento: jasmine.createSpy('analisarCancelamento'),
    itensPedido: jasmine.createSpy('itensPedido'),
    criarItem: jasmine.createSpy('criarItem'),
    atualizarItem: jasmine.createSpy('atualizarItem'),
    removerItem: jasmine.createSpy('removerItem'),
    cobrancaFinanceira: jasmine.createSpy('cobrancaFinanceira'),
    vincularFormaPagamentoFiscal: jasmine.createSpy('vincularFormaPagamentoFiscal'),
  };
  const pedidosApi = { listar: jasmine.createSpy('pedidosListar') };
  const lojasApi = { list: jasmine.createSpy('lojasList') };
  const fornecedoresApi = { list: jasmine.createSpy('fornecedoresList') };
  const formasPagamentoApi = { list: jasmine.createSpy('formasPagamentoList') };

  beforeEach(async () => {
    localStorage.clear();
    notasApi.listar.and.returnValue(of({ count: 42, next: null, previous: null, results: [nota] }));
    notasApi.indicadores.and.returnValue(of({ total: 42, abertas: 20, fechadas: 15, canceladas: 7, valor_total: '1234.56' }));
    notasApi.get.and.returnValue(of(nota));
    notasApi.itensPedido.and.returnValue(of([itemBase, itemOutro]));
    notasApi.criarItem.and.returnValue(of({ id: 202, nota: nota.id, pedido_item: itemOutro.pedido_item, qtd_recebida: '2.000', preco_unit_nf: '10.0000', desconto_item: '0.00', total_item: '20.00' }));
    notasApi.atualizarItem.and.returnValue(of({ id: 201, nota: nota.id, pedido_item: itemBase.pedido_item, qtd_recebida: '1.000', preco_unit_nf: '10.0000', desconto_item: '0.00', total_item: '10.00' }));
    notasApi.removerItem.and.returnValue(of(undefined));
    notasApi.cobrancaFinanceira.and.returnValue(of({ usa_duplicatas: false, valor_fatura: '0.00', parcelas: [], pagamentos: [], sugestoes: [], pendencias: [], forma_pagamento_conciliada: true, forma_pagamento_sysvar_id: null, forma_pagamento_sysvar_codigo: null, forma_pagamento_sysvar_descricao: null, forma_pagamento_sysvar_tipo: null, financeiro_pronto: true }));
    notasApi.vincularFormaPagamentoFiscal.and.returnValue(of({ cobranca: { usa_duplicatas: true, valor_fatura: '100.00', parcelas: [], pagamentos: [], sugestoes: [], pendencias: [], forma_pagamento_conciliada: true, forma_pagamento_sysvar_id: 8, forma_pagamento_sysvar_codigo: 'BOL', forma_pagamento_sysvar_descricao: 'Boleto', forma_pagamento_sysvar_tipo: 'BOLETO', financeiro_pronto: true } }));
    notasApi.fechar.and.returnValue(of({ ...nota, status: 'FE' as const, xml_importado: true }));
    notasApi.cancelar.and.returnValue(of({ ...nota, status: 'CA' as const }));
    notasApi.recusar.and.returnValue(of({ detail: 'Entrada recusada. O XML poderá ser importado novamente.', id: nota.id, chave_acesso: nota.chave_acesso }));
    notasApi.importarXml.and.returnValue(of({ ...nota, xml_importado: true, pedido_compra: null }));
    notasApi.listarItensXml.and.returnValue(of([]));
    notasApi.resumoConciliacao.and.returnValue(of({ total_itens: 0, itens_conciliados: 0, itens_pendentes: 0, nota_conciliada: false }));
    notasApi.resumoConferencia.and.returnValue(of({ total_itens: 0, itens_conferidos: 0, itens_nao_conferidos: 0, itens_com_divergencia: 0, quantidade_faltante_total: '0.000000', valor_divergente_total: '0.00', possui_divergencia_pendente: false, conversoes_pendentes: 0, conferencia_completa: false }));
    notasApi.divergenciasXml.and.returnValue(of([]));
    notasApi.conciliarAutomaticamente.and.returnValue(of({ resultado: {}, resumo: { total_itens: 1, itens_conciliados: 1, itens_pendentes: 0, nota_conciliada: true } }));
    notasApi.candidatosItemXml.and.returnValue(of([{ id: 5, referencia: 'REF', descricao: 'Produto', unidade_interna: 'UN' }]));
    notasApi.conciliarItemXml.and.returnValue(of({ id: 7, nota: 1, numero_item: 1, codigo_produto_fornecedor: 'A', descricao_produto: 'Item', gtin_ean: '', ncm: '', cfop: '', unidade_comercial: 'UN', quantidade_comercial: '1.000000', quantidade_recebida: null, valor_unitario_comercial: '10.00', valor_produto: '10.00', valor_desconto: '0.00', informacoes_adicionais: '', produto: 5, produto_fornecedor: 9, pedido_item: null, origem_conciliacao: 'MANUAL', conciliado: true, conferido: false } as any));
    notasApi.conferirItemXml.and.returnValue(of({ item: { id: 7, nota: 1, numero_item: 1, codigo_produto_fornecedor: 'A', descricao_produto: 'Item', gtin_ean: '', ncm: '', cfop: '', unidade_comercial: 'UN', quantidade_comercial: '1.000000', quantidade_recebida: '0.000000', valor_unitario_comercial: '10.00', valor_produto: '10.00', valor_desconto: '0.00', informacoes_adicionais: '', produto: 5, produto_fornecedor: 9, pedido_item: null, origem_conciliacao: 'MANUAL', conciliado: true, conferido: true } as any, divergencia: null, resumo: { total_itens: 1, itens_conferidos: 1, itens_nao_conferidos: 0, itens_com_divergencia: 1, quantidade_faltante_total: '1.000000', valor_divergente_total: '10.00', possui_divergencia_pendente: true, conversoes_pendentes: 0, conferencia_completa: true } }));
    notasApi.conferirItensXml.and.returnValue(of({ itens: [], resumo: { total_itens: 1, itens_conferidos: 1, itens_nao_conferidos: 0, itens_com_divergencia: 0, quantidade_faltante_total: '0.000000', valor_divergente_total: '0.00', possui_divergencia_pendente: false, conversoes_pendentes: 0, conferencia_completa: true } }));
    notasApi.analisarCancelamento.and.returnValue(of({ pode_cancelar: true, bloqueios: [], avisos: [], pedido: 10, valor_financeiro: '100.00' }));
    pedidosApi.listar.and.returnValue(of({ count: 1, results: [{ id: 10, tipo: '2', loja: 3, fornecedor: 4, emissao: '2026-01-01', status: 'AP', total_itens: '100.00', total_desconto: '0.00', frete: '0.00', total_pedido: '100.00' }] }));
    lojasApi.list.and.returnValue(of({ count: 1, results: [{ id: 3, nome_loja: 'Loja A' }] }));
    fornecedoresApi.list.and.returnValue(of({ count: 1, results: [{ id: 4, nome_fornecedor: 'Fornecedor A' }] }));
    formasPagamentoApi.list.and.returnValue(of({ count: 1, results: [{ Idformapagamento: 8, id: 8, codigo: 'BOL', descricao: 'Boleto', tipo: 'BOLETO', num_parcelas: 1, ativo: true }] }));

    await TestBed.configureTestingModule({
      imports: [NotasFiscaisEntradaComponent],
      providers: [
        provideRouter([]),
        { provide: NotasFiscaisEntradaService, useValue: notasApi },
        { provide: PedidosCompraService, useValue: pedidosApi },
        { provide: LojasService, useValue: lojasApi },
        { provide: FornecedoresService, useValue: fornecedoresApi },
        { provide: FormasPagamentoService, useValue: formasPagamentoApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotasFiscaisEntradaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carrega pagina atual pelo backend sem page_size artificial de 1000', () => {
    expect(notasApi.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, page_size: 20 }));
    expect(notasApi.listar).not.toHaveBeenCalledWith(jasmine.objectContaining({ page_size: 1000 }));
    expect(component.notasPagina).toEqual([nota]);
    expect(component.total).toBe(42);
  });

  it('mudanca de pagina e de itens por pagina disparam nova consulta', () => {
    component.totalRecords = 42;

    component.nextPage();
    expect(notasApi.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page: 2, page_size: 20 }));

    component.onPageSizeChange('50');
    expect(notasApi.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, page_size: 50 }));
  });

  it('alteracao de filtro volta para primeira pagina e envia filtros ao backend', () => {
    component.page = 3;
    component.search = 'Alpha';
    component.filtroStatus = 'FE';
    component.filtroFornecedor = 4;
    component.filtroLoja = 3;
    component.filtroEmissaoDe = '2026-01-01';
    component.filtroEmissaoAte = '2026-01-31';
    component.filtroEntradaDe = '2026-02-01';
    component.filtroEntradaAte = '2026-02-28';
    component.filtroValorMin = 100;
    component.filtroValorMax = 500;

    component.applyFilter();

    expect(component.page).toBe(1);
    expect(notasApi.listar).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 1,
      page_size: 20,
      search: 'Alpha',
      status: 'FE',
      fornecedor: 4,
      loja: 3,
      dt_emissao_de: '2026-01-01',
      dt_emissao_ate: '2026-01-31',
      dt_entrada_de: '2026-02-01',
      dt_entrada_ate: '2026-02-28',
      valor_min: 100,
      valor_max: 500,
    }));
  });

  it('usa count e indicadores do backend sem calcular apenas sobre a pagina', () => {
    expect(component.total).toBe(42);
    expect(component.abertas).toBe(20);
    expect(component.fechadas).toBe(15);
    expect(component.canceladas).toBe(7);
    expect(component.valorTotalListado).toBe(1234.56);
    expect(notasApi.indicadores).toHaveBeenCalled();
  });

  it('limpa selecao quando registro selecionado sai da pagina atual', () => {
    component.selectedNota = { ...nota, id: 99 };

    component.loadNotas();

    expect(component.selectedNota).toBeNull();
  });

  it('tabela de itens nao possui coluna ou botoes de acoes por linha', () => {
    component.editar(nota);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const headers = Array.from(el.querySelectorAll('.itens-wrapper th')).map(th => th.textContent?.trim());
    expect(headers).not.toContain('Ações');
    expect(el.textContent).not.toContain('Inserir');
    expect(el.textContent).not.toContain('Remover');
    expect(el.querySelector('.item-action-bar')).toBeNull();
    expect(el.querySelector('.itens-wrapper .actions-cell')).toBeNull();
    expect(el.querySelectorAll('.itens-wrapper tbody .btn').length).toBe(0);
  });

  it('exibe checkbox por item refletindo se ja existe nota_item persistido', () => {
    component.editar(nota);
    fixture.detectChanges();

    const checks = fixture.nativeElement.querySelectorAll('.confirm-checkbox') as NodeListOf<HTMLInputElement>;
    expect(checks.length).toBe(2);
    expect(checks[0].checked).toBeTrue();
    expect(checks[1].checked).toBeFalse();
  });

  it('clicar em uma linha seleciona somente um item e aplica destaque', () => {
    component.editar(nota);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.itens-wrapper tbody tr') as NodeListOf<HTMLTableRowElement>;

    rows[0].click();
    fixture.detectChanges();
    expect(component.selectedItem?.pedido_item).toBe(101);
    expect(rows[0].classList.contains('selected')).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.itens-wrapper tbody tr.selected').length).toBe(1);

    rows[1].click();
    fixture.detectChanges();
    expect(component.selectedItem?.pedido_item).toBe(102);
    expect(rows[1].classList.contains('selected')).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.itens-wrapper tbody tr.selected').length).toBe(1);
  });

  it('checkbox confirma item sem substituir a selecao visual da linha', () => {
    component.editar(nota);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.itens-wrapper tbody tr') as NodeListOf<HTMLTableRowElement>;
    const checkbox = fixture.nativeElement.querySelectorAll('.confirm-checkbox')[1] as HTMLInputElement;

    rows[0].click();
    fixture.detectChanges();
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(component.selectedItem?.pedido_item).toBe(101);
    expect(rows[0].classList.contains('selected')).toBeTrue();
    expect(rows[1].classList.contains('selected')).toBeFalse();
    expect(notasApi.criarItem).toHaveBeenCalledWith(jasmine.objectContaining({ pedido_item: 102 }));
  });

  it('marcar checkbox usa a mesma gravacao do inserir e so confirma apos sucesso', () => {
    const save$ = new Subject<any>();
    notasApi.criarItem.and.returnValue(save$);
    component.editar(nota);
    fixture.detectChanges();

    const item = component.itensPedido[1];
    item.qtd_receber = 2;
    item.preco_unit_nf = 11;
    item.desconto_item = 1;
    const checkbox = fixture.nativeElement.querySelectorAll('.confirm-checkbox')[1] as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(notasApi.criarItem).toHaveBeenCalledWith(jasmine.objectContaining({
      pedido_item: 102,
      qtd_recebida: '2',
      preco_unit_nf: '11',
      desconto_item: '1',
    }));
    expect(component.itemConfirmado(item)).toBeFalse();

    save$.next({ id: 202, nota: nota.id, pedido_item: 102 });
    save$.complete();
    fixture.detectChanges();
    expect(component.itemConfirmado(item)).toBeTrue();
  });

  it('erro ao marcar checkbox mantem item desmarcado', () => {
    notasApi.criarItem.and.returnValue(throwError(() => ({ error: { detail: 'Falha ao gravar' } })));
    component.editar(nota);
    fixture.detectChanges();

    const item = component.itensPedido[1];
    const checkbox = fixture.nativeElement.querySelectorAll('.confirm-checkbox')[1] as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(component.itemConfirmado(item)).toBeFalse();
    expect(component.erro).toBe('Falha ao gravar');
  });

  it('desmarcar item gravado abre confirmacao e remove usando fluxo existente', () => {
    component.editar(nota);
    fixture.detectChanges();

    const item = component.itensPedido[0];
    const checkbox = fixture.nativeElement.querySelectorAll('.confirm-checkbox')[0] as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(component.confirmModal?.item?.pedido_item).toBe(101);

    component.confirmarAcao();

    expect(notasApi.removerItem).toHaveBeenCalledWith(201);
    expect(component.selectedItem).toBeNull();
    expect(component.itemConfirmado(item)).toBeFalse();
  });

  it('erro ao remover mantem checkbox marcado e item na nf', () => {
    notasApi.removerItem.and.returnValue(throwError(() => ({ error: { detail: 'falha' } })));
    component.editar(nota);
    fixture.detectChanges();

    const item = component.itensPedido[0];
    const checkbox = fixture.nativeElement.querySelectorAll('.confirm-checkbox')[0] as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    component.confirmarAcao();

    expect(component.itemConfirmado(item)).toBeTrue();
    expect(item.nota_item).toBe(201);
    expect(component.erro).toContain('Não foi possível remover');
  });

  it('trocar contexto limpa selecao antiga de item', () => {
    component.editar(nota);
    component.selecionarItem(component.itensPedido[0]);

    component.editar({ ...nota, id: 9, numero: '999' });

    expect(component.selectedItem).toBeNull();
  });

  it('estados AB FE e CA controlam alteracao dos itens', () => {
    component.editar(nota);
    expect(component.podeAlterarItem(component.itensPedido[0])).toBeTrue();

    component.editar(notaFechada);
    fixture.detectChanges();
    let checks = fixture.nativeElement.querySelectorAll('.confirm-checkbox') as NodeListOf<HTMLInputElement>;
    expect(component.podeAlterarItem(component.itensPedido[0])).toBeFalse();
    expect(checks[0].checked).toBeTrue();
    expect(checks[0].disabled).toBeTrue();
    expect(checks[1].checked).toBeFalse();
    expect(checks[1].disabled).toBeTrue();

    component.editar(notaCancelada);
    fixture.detectChanges();
    checks = fixture.nativeElement.querySelectorAll('.confirm-checkbox') as NodeListOf<HTMLInputElement>;
    expect(component.podeAlterarItem(component.itensPedido[0])).toBeFalse();
    expect(checks[0].checked).toBeTrue();
    expect(checks[0].disabled).toBeTrue();
    expect(checks[1].checked).toBeFalse();
    expect(checks[1].disabled).toBeTrue();
  });

  it('pedido selecionado exibe pedido loja fornecedor e tipo', () => {
    component.editar(nota);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Pedido');
    expect(text).toContain('10');
    expect(text).toContain('Loja');
    expect(text).toContain('3 - Loja A');
    expect(text).toContain('Fornecedor');
    expect(text).toContain('4 - Fornecedor A');
    expect(text).toContain('Uso/Consumo');
  });

  it('cabecalho bloqueia data de entrada anterior a emissao antes da chamada', () => {
    component.novo();
    component.form.patchValue({
      pedido_compra: 10,
      numero: '123',
      dt_emissao: '2026-08-11',
      dt_entrada: '2026-08-10',
    });

    component.salvarCabecalho();

    expect(component.erro).toContain('Data de entrada');
    expect(notasApi.criar).not.toHaveBeenCalled();
  });

  it('itens exibem pedida recebida anteriormente saldo pendente e nesta nf', () => {
    component.editar(nota);
    fixture.detectChanges();

    const headers = Array.from(fixture.nativeElement.querySelectorAll('.itens-wrapper th') as NodeListOf<HTMLElement>).map(th => th.textContent?.trim());
    expect(headers).toContain('Pedida');
    expect(headers).toContain('Já recebida');
    expect(headers).toContain('Saldo pendente');
    expect(headers).toContain('Nesta NF');
  });

  it('desconto acima do bruto impede envio e desconto igual ao bruto e aceito', () => {
    notasApi.atualizarItem.calls.reset();
    component.editar(nota);
    const item = component.itensPedido[0];
    component.selecionarItem(item);
    item.qtd_receber = 10;
    item.saldo_total_recebivel = '10.000';
    item.preco_unit_nf = 5;
    item.desconto_item = 50.01;

    component.salvarItem(item);

    expect(component.erro).toContain('Desconto do item');
    expect(notasApi.atualizarItem).not.toHaveBeenCalled();

    item.desconto_item = 50;
    component.salvarItem(item);

    expect(notasApi.atualizarItem).toHaveBeenCalledWith(201, jasmine.objectContaining({ desconto_item: '50' }));
  });

  it('desconto negativo impede envio e total visual nunca fica negativo', () => {
    component.editar(nota);
    const item = component.itensPedido[0];
    item.qtd_receber = 1;
    item.preco_unit_nf = 5;
    item.desconto_item = 10;
    component.recalcularItem(item);
    expect(item.total_item).toBe(0);

    item.desconto_item = -1;
    component.selecionarItem(item);
    component.salvarItem(item);

    expect(component.erro).toContain('Desconto do item');
  });

  it('validacoes de quantidade e pack continuam funcionando', () => {
    component.editar(nota);
    const item = component.itensPedido[0];
    item.qtd_receber = 3;
    item.saldo_total_recebivel = '2.000';

    component.salvarItem(item);
    expect(component.erro).toContain('Quantidade recebida');

    const itemPack = { ...item, qtd_receber: 3, saldo_total_recebivel: '10.000', pack: 1, quantidades_validas: ['2', '4'] };
    component.salvarItem(itemPack);
    expect(component.erro).toContain('precisa fechar com o pack');
  });

  it('nao importa RowActionsMenuComponent para os itens da nf', () => {
    component.editar(nota);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-row-actions-menu')).toBeNull();
  });

  it('importa XML, abre NF importada e exibe erro da API sem object Object', () => {
    const file = new File(['<xml/>'], 'nfe.xml');
    component.abrirImportacaoXml();
    component.importArquivo = file;
    component.importPedido = null;
    component.importarXml();
    expect(notasApi.importarXml).toHaveBeenCalledWith(file, null);
    expect(component.notaAtual()?.xml_importado).toBeTrue();
    expect(component.mensagem).toContain('XML importado');

    notasApi.importarXml.and.returnValue(throwError(() => ({ error: { chave_acesso: ['NF-e já importada para esta chave de acesso.'] } })));
    component.abrirImportacaoXml();
    component.importArquivo = file;
    component.importarXml();
    expect(component.erro).toBe('NF-e já importada para esta chave de acesso.');
  });

  it('NF XML carrega itens, resumos e mostra item pendente com ação de vínculo', () => {
    const itemXml = { id: 7, nota: 1, numero_item: 1, codigo_produto_fornecedor: 'A1', descricao_produto: 'Item XML', gtin_ean: '', ncm: '', cfop: '', unidade_comercial: 'CX', quantidade_comercial: '10.000000', quantidade_recebida: null, valor_unitario_comercial: '5.00', valor_produto: '50.00', valor_desconto: '0.00', informacoes_adicionais: '', produto: null, produto_fornecedor: null, pedido_item: null, origem_conciliacao: '', conciliado: false, conferido: false, conversao: { conversao_pendente: true } } as any;
    notasApi.listarItensXml.and.returnValue(of([itemXml]));

    component.editar({ ...nota, xml_importado: true, pedido_compra: null });
    fixture.detectChanges();

    expect(notasApi.listarItensXml).toHaveBeenCalledWith(1);
    expect(notasApi.resumoConciliacao).toHaveBeenCalledWith(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Vincular produto');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Conversão de unidade pendente');
  });

  it('NF XML sem pedido mostra cobrança e bloqueia efetivação até vincular tPag', () => {
    notasApi.cobrancaFinanceira.and.returnValue(of({
      usa_duplicatas: true,
      valor_fatura: '100.00',
      parcelas: [{ numero: '001', vencimento: '2026-09-25', valor: '100.00' }],
      pagamentos: [{ codigo_tpag: '15', descricao_tpag: 'Boleto bancário', valor: '100.00' }],
      sugestoes: [{ id: 8, codigo: 'BOL', descricao: 'Boleto', tipo: 'BOLETO' }],
      pendencias: ['Concilie a forma de pagamento do XML antes de efetivar a NF-e.'],
      forma_pagamento_conciliada: false,
      forma_pagamento_sysvar_id: null,
      forma_pagamento_sysvar_codigo: null,
      forma_pagamento_sysvar_descricao: null,
      forma_pagamento_sysvar_tipo: null,
      financeiro_pronto: false,
    }));

    component.editar({ ...nota, xml_importado: true, pedido_compra: null });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Cobrança / Financeiro');
    expect(text).toContain('Boleto bancário');
    expect(text).toContain('001');
    expect(component.motivosBloqueioEfetivar()).toContain('Concilie a forma de pagamento do XML antes de efetivar a NF-e.');
  });

  it('vincula forma fiscal usando sugestao sem alterar busca de produto', () => {
    component.notaAtual.set({ ...nota, xml_importado: true, pedido_compra: null });
    component.cobrancaFinanceira = {
      usa_duplicatas: true,
      valor_fatura: '100.00',
      parcelas: [],
      pagamentos: [{ codigo_tpag: '15', descricao_tpag: 'Boleto bancário', valor: '100.00' }],
      sugestoes: [{ id: 8, codigo: 'BOL', descricao: 'Boleto', tipo: 'BOLETO' }],
      pendencias: ['Concilie a forma de pagamento do XML antes de efetivar a NF-e.'],
      forma_pagamento_conciliada: false,
      forma_pagamento_sysvar_id: null,
      forma_pagamento_sysvar_codigo: null,
      forma_pagamento_sysvar_descricao: null,
      forma_pagamento_sysvar_tipo: null,
      financeiro_pronto: false,
    };

    component.abrirFormaPagamentoFiscal();
    expect(formasPagamentoApi.list).toHaveBeenCalledWith({ ativo: true });
    expect(component.formaPagamentoModal?.selecionado).toBe(8);

    component.confirmarFormaPagamentoFiscal();
    expect(notasApi.vincularFormaPagamentoFiscal).toHaveBeenCalledWith(1, '15', 8);
    expect(component.formaPagamentoModal).toBeNull();
    expect(component.cobrancaFinanceira?.forma_pagamento_conciliada).toBeTrue();
  });

  it('busca candidatos, concilia manualmente e mostra conflito de vínculo', () => {
    const itemXml = { id: 7, descricao_produto: 'Item XML', codigo_produto_fornecedor: 'A1', gtin_ean: '', unidade_comercial: 'CX' } as any;
    component.notaAtual.set({ ...nota, xml_importado: true });
    component.abrirConciliacao(itemXml);
    expect(notasApi.candidatosItemXml).toHaveBeenCalledWith(1, 7, 'Item XML');

    component.conciliacaoModal!.selecionado = 5;
    component.confirmarConciliacaoXml();
    expect(notasApi.conciliarItemXml).toHaveBeenCalledWith(1, 7, 5);

    notasApi.conciliarItemXml.and.returnValue(throwError(() => ({ error: { detail: 'Código externo já vinculado a outro Produto.' } })));
    component.abrirConciliacao(itemXml);
    component.conciliacaoModal!.selecionado = 5;
    component.confirmarConciliacaoXml();
    expect(component.erro).toContain('Código externo');
  });

  it('conferencia preserva zero, rejeita acima da fiscal e atualiza divergencia', () => {
    component.notaAtual.set({ ...nota, xml_importado: true });
    const itemXml = { id: 7, conciliado: true, conferido: false, quantidade_comercial: '10.000000', quantidade_recebida: null, recebidoInput: 0 } as any;
    component.conferirItemXml(itemXml);
    expect(notasApi.conferirItemXml).toHaveBeenCalledWith(1, 7, 0);

    itemXml.recebidoInput = 11;
    component.conferirItemXml(itemXml);
    expect(component.erro).toContain('menor ou igual');
  });

  it('efetivacao bloqueia pendencias e habilita com prontidao do backend', () => {
    component.notaAtual.set({ ...nota, xml_importado: true });
    component.resumoConciliacao = { total_itens: 2, itens_conciliados: 1, itens_pendentes: 1, nota_conciliada: false };
    component.resumoConferencia = { total_itens: 2, itens_conferidos: 2, itens_nao_conferidos: 0, itens_com_divergencia: 1, quantidade_faltante_total: '1', valor_divergente_total: '10.00', possui_divergencia_pendente: true, conversoes_pendentes: 0, conferencia_completa: true };
    expect(component.podeEfetivarXml()).toBeFalse();

    component.resumoConciliacao = { total_itens: 2, itens_conciliados: 2, itens_pendentes: 0, nota_conciliada: true };
    expect(component.podeEfetivarXml()).toBeTrue();
    component.confirmarEfetivacaoXml();
    expect(notasApi.fechar).toHaveBeenCalledWith(1);
  });

  it('recusa entrada XML aberta pelo endpoint proprio e volta para a lista', () => {
    notasApi.cancelar.calls.reset();
    component.notaAtual.set({ ...nota, xml_importado: true });
    component.view.set('form');
    component.recusarEntradaXml();
    expect(component.confirmModal?.text).toContain('poderá ser utilizada novamente');

    component.confirmarAcao();
    expect(notasApi.recusar).toHaveBeenCalledWith(1);
    expect(notasApi.cancelar).not.toHaveBeenCalled();
    expect(component.view()).toBe('list');
    expect(component.notaAtual()).toBeNull();
    expect(component.mensagem).toContain('O XML poderá ser importado novamente');
  });

  it('analisa cancelamento, bloqueia baixa financeira e envia motivo com confirmação de avisos', () => {
    component.notaAtual.set(notaFechada);
    notasApi.analisarCancelamento.and.returnValue(of({ pode_cancelar: false, bloqueios: ['O título financeiro vinculado à NF já possui baixa. Reverta/levante a baixa no Financeiro antes de cancelar a NF.'], avisos: [], pedido: 10, valor_financeiro: '100.00' }));
    component.abrirCancelamentoOperacional();
    expect(component.podeConfirmarCancelamento()).toBeFalse();

    notasApi.analisarCancelamento.and.returnValue(of({ pode_cancelar: true, bloqueios: [], avisos: [{ tipo: 'SALDO_NEGATIVO' }], pedido: 10, valor_financeiro: '100.00' } as any));
    component.abrirCancelamentoOperacional();
    component.motivoCancelamento = 'Erro de lançamento';
    expect(component.podeConfirmarCancelamento()).toBeFalse();
    component.confirmacaoAvisosCancelamento = true;
    component.confirmarCancelamentoOperacional();
    expect(notasApi.cancelar).toHaveBeenCalledWith(2, 'Erro de lançamento', true);
  });
});
