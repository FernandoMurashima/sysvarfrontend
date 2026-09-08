import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { FornecedoresService } from '../../core/services/fornecedores.service';
import { LojasService } from '../../core/services/lojas.service';
import { RecebimentoMercadoriaService } from '../../core/services/recebimento-mercadoria.service';
import { XmlFornecedorRecebidoService } from '../../core/services/xml-fornecedor-recebido.service';
import { NfeDetectadasComponent } from './nfe-detectadas.component';

describe('NfeDetectadasComponent', () => {
  let fixture: ComponentFixture<NfeDetectadasComponent>;
  let component: NfeDetectadasComponent;
  let api: jasmine.SpyObj<XmlFornecedorRecebidoService>;
  let recebimentosApi: jasmine.SpyObj<RecebimentoMercadoriaService>;
  let router: jasmine.SpyObj<Router>;
  let lojasApi: jasmine.SpyObj<LojasService>;
  let fornecedoresApi: jasmine.SpyObj<FornecedoresService>;

  const xml = {
    id: 1,
    empresa: 1,
    loja: 2,
    loja_nome: 'Fábrica',
    fornecedor: 3,
    fornecedor_nome: 'Fornecedor A',
    chave_acesso: '35260822345678000195550010000001234567890121',
    modelo: '55',
    serie: '1',
    numero: '123',
    dh_emissao: '2026-09-04T09:00:00-03:00',
    emitente_documento: '22345678000195',
    emitente_nome: 'Fornecedor A',
    destinatario_documento: '11222333000181',
    destinatario_nome: 'Fábrica',
    valor_total: '10.00',
    situacao_fiscal: 'AUTORIZADA',
    status_operacional: 'DETECTADO',
    caminho_origem_local: 'C:\\SysvarXML\\nfe123.xml',
    identificador_agente: 'AG-1',
    detectado_em: '2026-09-04T09:05:00-03:00',
    atualizado_em: '2026-09-04T09:05:00-03:00',
    tipo_tratamento: 'NAO_DEFINIDO',
    tipo_tratamento_display: 'Não definido',
  } as any;

  beforeEach(async () => {
    api = jasmine.createSpyObj<XmlFornecedorRecebidoService>('XmlFornecedorRecebidoService', ['listar', 'indicadores', 'get', 'definirTratamento', 'encaminharFiscal']);
    recebimentosApi = jasmine.createSpyObj<RecebimentoMercadoriaService>('RecebimentoMercadoriaService', ['iniciarPorXml']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    lojasApi = jasmine.createSpyObj<LojasService>('LojasService', ['list']);
    fornecedoresApi = jasmine.createSpyObj<FornecedoresService>('FornecedoresService', ['list']);
    api.listar.and.returnValue(of({ count: 1, next: null, previous: null, results: [xml] }));
    api.indicadores.and.returnValue(of({ total: 1, detectadas: 1, aguardando_recebimento: 0, em_recebimento: 0, recebidas_processadas: 0, pendentes: 1 }));
    api.definirTratamento.and.returnValue(of({ ...xml, tipo_tratamento: 'ESTOQUE', tipo_tratamento_display: 'Mercadoria para estoque' } as any));
    api.encaminharFiscal.and.returnValue(of({ id: 11, numero: '123' } as any));
    recebimentosApi.iniciarPorXml.and.returnValue(of({ id: 9 } as any));
    lojasApi.list.and.returnValue(of({ count: 1, next: null, previous: null, results: [{ id: 2, nome_loja: 'Fábrica' } as any] }));
    fornecedoresApi.list.and.returnValue(of({ count: 1, next: null, previous: null, results: [{ id: 3, nome_fornecedor: 'Fornecedor A' } as any] }));

    await TestBed.configureTestingModule({
      imports: [NfeDetectadasComponent],
      providers: [
        { provide: XmlFornecedorRecebidoService, useValue: api },
        { provide: RecebimentoMercadoriaService, useValue: recebimentosApi },
        { provide: Router, useValue: router },
        { provide: LojasService, useValue: lojasApi },
        { provide: FornecedoresService, useValue: fornecedoresApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NfeDetectadasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carrega listagem paginada e badges sem expor chave inteira na tabela', () => {
    const text = fixture.nativeElement.textContent;
    expect(api.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, page_size: 25 }));
    expect(text).toContain('NF-e detectadas');
    expect(text).toContain('Fábrica');
    expect(text).toContain('Fornecedor A');
    expect(text).toContain('123 / 1');
    expect(text).toContain('Detectado');
    expect(text).toContain('Autorizada');
    expect(text).toContain('Não definido');
    expect(text).not.toContain(xml.chave_acesso);
    expect(text).not.toContain('xml_original');
    expect(text).not.toContain('token_hash');
    expect(fixture.nativeElement.querySelector('button.status')).toBeFalsy();
  });

  it('inicia recebimento e navega para o detalhe', () => {
    component.iniciarRecebimento({ ...xml, tipo_tratamento: 'ESTOQUE' });

    expect(recebimentosApi.iniciarPorXml).toHaveBeenCalledWith(1);
    expect(router.navigate).toHaveBeenCalledWith(['/estoque/recebimentos-mercadoria', 9]);
  });

  it('envia filtros ao backend e limpa filtros', () => {
    component.filtros = {
      loja: '2',
      fornecedor: '3',
      status_operacional: 'DETECTADO',
      situacao_fiscal: 'AUTORIZADA',
      tipo_tratamento: 'ESTOQUE',
      search: ' 123 ',
      detectado_de: '2026-09-01',
      detectado_ate: '2026-09-04',
    };

    component.buscar();

    expect(api.listar).toHaveBeenCalledWith(jasmine.objectContaining({
      loja: '2',
      fornecedor: '3',
      status_operacional: 'DETECTADO',
      situacao_fiscal: 'AUTORIZADA',
      tipo_tratamento: 'ESTOQUE',
      search: '123',
      detectado_de: '2026-09-01',
      detectado_ate: '2026-09-04',
    }));

    component.limparFiltros();

    expect(component.filtros.search).toBe('');
    expect(component.page).toBe(1);
  });

  it('abre detalhes com chave completa, Agent e caminho local', () => {
    component.detalhes(xml);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain(xml.chave_acesso);
    expect(text).toContain('AG-1');
    expect(text).toContain('C:\\SysvarXML\\nfe123.xml');
    expect(text).toContain('Tratamento');
    expect(text).toContain('Não definido');
    expect(fixture.nativeElement.querySelector('a[href^="file:"]')).toBeFalsy();
  });

  it('abre modal Definir tratamento sem oferecer NAO_DEFINIDO', () => {
    component.abrirDefinirTratamento(xml);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const options = Array.from(fixture.nativeElement.querySelectorAll('.treatment-modal option')).map((option: any) => option.value);
    expect(text).toContain('Definir tratamento');
    expect(text).toContain('Tratamento atual');
    expect(text).toContain('Não definido');
    expect(options).not.toContain('NAO_DEFINIDO');
    expect(options).toContain('ESTOQUE');
  });

  it('confirma ESTOQUE e atualiza tratamento na tela', () => {
    component.rows = [xml];
    component.abrirDefinirTratamento(xml);
    component.tratamentoForm = 'ESTOQUE';

    component.confirmarTratamento();
    fixture.detectChanges();

    expect(api.definirTratamento).toHaveBeenCalledWith(1, 'ESTOQUE');
    expect(component.rows[0].tipo_tratamento).toBe('ESTOQUE');
    expect(component.rows[0].tipo_tratamento_display).toBe('Mercadoria para estoque');
    expect(component.tratamentoSelecionado).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Mercadoria para estoque');
  });

  it('exibe erro do backend ao definir tratamento', () => {
    api.definirTratamento.and.returnValue(throwError(() => ({
      error: { detail: 'Não é possível alterar o tratamento porque o processamento deste XML já foi iniciado.' },
    })));
    component.abrirDefinirTratamento(xml);
    component.tratamentoForm = 'USO_CONSUMO';

    component.confirmarTratamento();

    expect(component.errorMsg).toBe('Não é possível alterar o tratamento porque o processamento deste XML já foi iniciado.');
  });

  it('aplica regra do botão Iniciar recebimento por tratamento e status', () => {
    expect(component.podeIniciarRecebimento({ ...xml, tipo_tratamento: 'ESTOQUE', status_operacional: 'DETECTADO' })).toBeTrue();
    expect(component.podeIniciarRecebimento({ ...xml, tipo_tratamento: 'ESTOQUE', status_operacional: 'AGUARDANDO_RECEBIMENTO' })).toBeTrue();
    expect(component.podeIniciarRecebimento({ ...xml, tipo_tratamento: 'NAO_DEFINIDO', status_operacional: 'DETECTADO' })).toBeFalse();
    expect(component.podeIniciarRecebimento({ ...xml, tipo_tratamento: 'USO_CONSUMO', status_operacional: 'DETECTADO' })).toBeFalse();
    expect(component.podeIniciarRecebimento({ ...xml, tipo_tratamento: 'INSUMO_PRODUCAO', status_operacional: 'DETECTADO' })).toBeFalse();
    expect(component.podeIniciarRecebimento({ ...xml, tipo_tratamento: 'FISCAL_SEM_ESTOQUE', status_operacional: 'DETECTADO' })).toBeFalse();
    expect(component.podeIniciarRecebimento({ ...xml, tipo_tratamento: 'ESTOQUE', status_operacional: 'EM_RECEBIMENTO' })).toBeFalse();
  });

  it('mostra ou oculta Iniciar recebimento conforme tratamento', () => {
    component.rows = [
      { ...xml, id: 1, tipo_tratamento: 'ESTOQUE', tipo_tratamento_display: 'Mercadoria para estoque' },
      { ...xml, id: 2, tipo_tratamento: 'NAO_DEFINIDO', tipo_tratamento_display: 'Não definido' },
      { ...xml, id: 3, tipo_tratamento: 'USO_CONSUMO', tipo_tratamento_display: 'Uso e consumo' },
      { ...xml, id: 4, tipo_tratamento: 'INSUMO_PRODUCAO', tipo_tratamento_display: 'Insumo / produção' },
      { ...xml, id: 5, tipo_tratamento: 'FISCAL_SEM_ESTOQUE', tipo_tratamento_display: 'Entrada fiscal sem estoque' },
    ];
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')).filter((button: any) => button.textContent.includes('Iniciar recebimento'));
    expect(buttons.length).toBe(1);
  });

  it('mostra Encaminhar fiscal somente para tratamentos fiscais', () => {
    component.rows = [
      { ...xml, id: 1, tipo_tratamento: 'ESTOQUE', tipo_tratamento_display: 'Mercadoria para estoque' },
      { ...xml, id: 2, tipo_tratamento: 'NAO_DEFINIDO', tipo_tratamento_display: 'Não definido' },
      { ...xml, id: 3, tipo_tratamento: 'USO_CONSUMO', tipo_tratamento_display: 'Uso e consumo' },
      { ...xml, id: 4, tipo_tratamento: 'INSUMO_PRODUCAO', tipo_tratamento_display: 'Insumo / produção' },
      { ...xml, id: 5, tipo_tratamento: 'FISCAL_SEM_ESTOQUE', tipo_tratamento_display: 'Entrada fiscal sem estoque' },
    ];
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')).filter((button: any) => button.textContent.includes('Encaminhar fiscal'));
    expect(buttons.length).toBe(3);
    expect(component.podeEncaminharFiscal({ ...xml, tipo_tratamento: 'USO_CONSUMO' })).toBeTrue();
    expect(component.podeEncaminharFiscal({ ...xml, tipo_tratamento: 'INSUMO_PRODUCAO' })).toBeTrue();
    expect(component.podeEncaminharFiscal({ ...xml, tipo_tratamento: 'FISCAL_SEM_ESTOQUE' })).toBeTrue();
    expect(component.podeEncaminharFiscal({ ...xml, tipo_tratamento: 'ESTOQUE' })).toBeFalse();
    expect(component.podeEncaminharFiscal({ ...xml, tipo_tratamento: 'NAO_DEFINIDO' })).toBeFalse();
  });

  it('encaminha fiscal e navega para a nota retornada', () => {
    const row = { ...xml, tipo_tratamento: 'USO_CONSUMO' };

    component.encaminharFiscal(row);

    expect(api.encaminharFiscal).toHaveBeenCalledWith(1);
    expect(router.navigate).toHaveBeenCalledWith(['/compras/notas-entrada'], { queryParams: { nota: 11 } });
  });

  it('aceita retorno idempotente e evita duplo clique no encaminhamento fiscal', () => {
    const pending = new Subject<any>();
    api.encaminharFiscal.and.returnValue(pending.asObservable());
    const row = { ...xml, tipo_tratamento: 'FISCAL_SEM_ESTOQUE' };

    component.encaminharFiscal(row);
    component.encaminharFiscal(row);

    expect(api.encaminharFiscal).toHaveBeenCalledTimes(1);
    expect(component.encaminhandoFiscalId).toBe(1);
    pending.next({ id: 22, numero: '123' });
    pending.complete();
    expect(router.navigate).toHaveBeenCalledWith(['/compras/notas-entrada'], { queryParams: { nota: 22 } });
    expect(component.encaminhandoFiscalId).toBeNull();
  });

  it('exibe erro de negocio ao encaminhar fiscal', () => {
    api.encaminharFiscal.and.returnValue(throwError(() => ({
      error: { fornecedor: ['Fornecedor do emitente não identificado na empresa.'] },
    })));

    component.encaminharFiscal({ ...xml, tipo_tratamento: 'INSUMO_PRODUCAO' });

    expect(component.errorMsg).toBe('Fornecedor do emitente não identificado na empresa.');
  });

  it('cancelar modal nao chama API', () => {
    component.abrirDefinirTratamento(xml);

    component.fecharDefinirTratamento();

    expect(component.tratamentoSelecionado).toBeNull();
    expect(api.definirTratamento).not.toHaveBeenCalled();
  });

  it('bloqueia duplo clique durante request', () => {
    const pending = new Subject<any>();
    api.definirTratamento.and.returnValue(pending.asObservable());
    component.abrirDefinirTratamento(xml);
    component.tratamentoForm = 'ESTOQUE';

    component.confirmarTratamento();
    component.confirmarTratamento();

    expect(api.definirTratamento).toHaveBeenCalledTimes(1);
    expect(component.salvandoTratamento).toBeTrue();
    pending.next({ ...xml, tipo_tratamento: 'ESTOQUE', tipo_tratamento_display: 'Mercadoria para estoque' });
    pending.complete();
    expect(component.salvandoTratamento).toBeFalse();
  });

  it('trata fornecedor e estabelecimento nao identificados na tabela sem usar nomes do XML', () => {
    const row = {
      ...xml,
      loja: null,
      loja_nome: null,
      fornecedor: null,
      fornecedor_nome: null,
      emitente_nome: 'Emitente somente no XML',
      destinatario_nome: 'Destinatário somente no XML',
    };

    expect(component.fornecedorNome(row)).toBe('Fornecedor não identificado');
    expect(component.lojaNome(row)).toBe('Estabelecimento não identificado');
  });

  it('mantem emitente e destinatario do XML nos detalhes', () => {
    const row = {
      ...xml,
      loja: null,
      loja_nome: null,
      fornecedor: null,
      fornecedor_nome: null,
      emitente_nome: 'Emitente somente no XML',
      destinatario_nome: 'Destinatário somente no XML',
    };

    component.detalhes(row);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Fornecedor não identificado');
    expect(text).toContain('Estabelecimento não identificado');
    expect(text).toContain('Emitente somente no XML');
    expect(text).toContain('Destinatário somente no XML');
  });

  it('exibe estado vazio', () => {
    api.listar.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    component.carregar();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma NF-e detectada encontrada.');
  });

  it('exibe erro amigavel de API', () => {
    api.listar.and.returnValue(throwError(() => ({ status: 500 })));
    component.carregar();
    fixture.detectChanges();

    expect(component.errorMsg).toBe('Não foi possível carregar as NF-e detectadas.');
  });

  it('navega pela paginacao', () => {
    component.count = 30;
    component.nextPage();
    expect(component.page).toBe(2);
    component.prevPage();
    expect(component.page).toBe(1);
  });
});
