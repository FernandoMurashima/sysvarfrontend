import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { FornecedoresService } from '../../core/services/fornecedores.service';
import { LojasService } from '../../core/services/lojas.service';
import { XmlFornecedorRecebidoService } from '../../core/services/xml-fornecedor-recebido.service';
import { NfeDetectadasComponent } from './nfe-detectadas.component';

describe('NfeDetectadasComponent', () => {
  let fixture: ComponentFixture<NfeDetectadasComponent>;
  let component: NfeDetectadasComponent;
  let api: jasmine.SpyObj<XmlFornecedorRecebidoService>;
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
  } as any;

  beforeEach(async () => {
    api = jasmine.createSpyObj<XmlFornecedorRecebidoService>('XmlFornecedorRecebidoService', ['listar', 'indicadores', 'get']);
    lojasApi = jasmine.createSpyObj<LojasService>('LojasService', ['list']);
    fornecedoresApi = jasmine.createSpyObj<FornecedoresService>('FornecedoresService', ['list']);
    api.listar.and.returnValue(of({ count: 1, next: null, previous: null, results: [xml] }));
    api.indicadores.and.returnValue(of({ total: 1, detectadas: 1, aguardando_recebimento: 0, em_recebimento: 0, recebidas_processadas: 0, pendentes: 1 }));
    lojasApi.list.and.returnValue(of({ count: 1, next: null, previous: null, results: [{ id: 2, nome_loja: 'Fábrica' } as any] }));
    fornecedoresApi.list.and.returnValue(of({ count: 1, next: null, previous: null, results: [{ id: 3, nome_fornecedor: 'Fornecedor A' } as any] }));

    await TestBed.configureTestingModule({
      imports: [NfeDetectadasComponent],
      providers: [
        { provide: XmlFornecedorRecebidoService, useValue: api },
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
    expect(text).not.toContain(xml.chave_acesso);
    expect(text).not.toContain('xml_original');
    expect(text).not.toContain('token_hash');
    expect(fixture.nativeElement.querySelector('button.status')).toBeFalsy();
  });

  it('envia filtros ao backend e limpa filtros', () => {
    component.filtros = {
      loja: '2',
      fornecedor: '3',
      status_operacional: 'DETECTADO',
      situacao_fiscal: 'AUTORIZADA',
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
    expect(fixture.nativeElement.querySelector('a[href^="file:"]')).toBeFalsy();
  });

  it('trata fornecedor e estabelecimento nao identificados', () => {
    const row = { ...xml, loja: null, loja_nome: null, fornecedor: null, fornecedor_nome: null, emitente_nome: '', destinatario_nome: '' };

    expect(component.fornecedorNome(row)).toBe('Fornecedor não identificado');
    expect(component.lojaNome(row)).toBe('Estabelecimento não identificado');
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
