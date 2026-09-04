import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

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

  beforeEach(async () => {
    api = jasmine.createSpyObj<RecebimentoMercadoriaService>('RecebimentoMercadoriaService', ['get', 'pedidosElegiveis', 'vincularPedidos', 'gerarConferencia', 'salvarConferencia']);
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
    expect(component.modalConferenciaAberto).toBeTrue();
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
    component.fecharConferencia();

    expect(component.modalConferenciaAberto).toBeFalse();
  });

  it('exibe erro de API ao gerar conferencia', () => {
    api.gerarConferencia.and.returnValue(throwError(() => ({ status: 400 })));
    component.gerarConferencia();

    expect(component.errorMsg).toBe('Não foi possível gerar a conferência física.');
  });
});
