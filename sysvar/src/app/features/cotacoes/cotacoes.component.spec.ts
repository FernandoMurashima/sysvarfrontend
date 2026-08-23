import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CotacoesService } from '../../core/services/cotacoes.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { RequisicoesService } from '../../core/services/requisicoes.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { CotacoesComponent } from './cotacoes.component';

describe('CotacoesComponent', () => {
  let fixture: ComponentFixture<CotacoesComponent>;
  let component: CotacoesComponent;
  let api: jasmine.SpyObj<CotacoesService>;
  let requisicoesApi: jasmine.SpyObj<RequisicoesService>;
  let fornecedoresApi: jasmine.SpyObj<FornecedoresService>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<CotacoesService>('CotacoesService', ['listar', 'criar', 'atualizar', 'listarItens', 'criarItem', 'atualizarItem', 'excluirItem', 'listarFornecedores', 'adicionarFornecedor', 'atualizarFornecedor', 'removerFornecedor', 'listarPropostas', 'criarProposta', 'atualizarProposta', 'comparativo', 'selecionarVencedor', 'enviarAprovacao', 'aprovar', 'rejeitar', 'cancelar', 'apoioDecisaoItem', 'requisicoesDisponiveis', 'necessidades', 'adicionarRequisicoes', 'removerRequisicao']);
    requisicoesApi = jasmine.createSpyObj<RequisicoesService>('RequisicoesService', ['lojasPermitidas', 'listarCategoriasMaterial']);
    fornecedoresApi = jasmine.createSpyObj<FornecedoresService>('FornecedoresService', ['list']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['podeAcessarModulo', 'getCurrentUser', 'podeProcesso']);
    api.listar.and.returnValue(of([{ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any]));
    requisicoesApi.lojasPermitidas.and.returnValue(of([{ id: 2, nome_loja: 'Loja A' }]));
    requisicoesApi.listarCategoriasMaterial.and.returnValue(of([{ id: 30, nome: 'Informática' }] as any));
    api.criar.and.returnValue(of({ id: 8, numero: 2, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any));
    api.atualizar.and.returnValue(of({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'URGENTE', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any));
    api.listarItens.and.returnValue(of([{ id: 10, cotacao: 7, origem: 'AVULSO', descricao: 'Item', quantidade_cotar: '1.000', unidade: 4, permite_alternativo: true } as any]));
    api.criarItem.and.returnValue(of({ id: 11, cotacao: 7, origem: 'AVULSO', descricao: 'Novo', quantidade_cotar: '2.000', unidade: 4, permite_alternativo: true } as any));
    api.atualizarItem.and.returnValue(of({ id: 10, cotacao: 7, origem: 'AVULSO', descricao: 'Editado', quantidade_cotar: '3.000', unidade: 4, permite_alternativo: false } as any));
    api.excluirItem.and.returnValue(of(undefined));
    api.listarFornecedores.and.returnValue(of([{ id: 50, cotacao: 7, fornecedor: 40, fornecedor_nome: 'Fornecedor A', status_participacao: 'CONVIDADO', observacao: '' } as any]));
    api.adicionarFornecedor.and.returnValue(of({ id: 51, cotacao: 7, fornecedor: 41, fornecedor_nome: 'Fornecedor B', status_participacao: 'CONVIDADO' } as any));
    api.atualizarFornecedor.and.returnValue(of({ id: 50, cotacao: 7, fornecedor: 40, fornecedor_nome: 'Fornecedor A', status_participacao: 'RECUSOU' } as any));
    api.removerFornecedor.and.returnValue(of(undefined));
    api.listarPropostas.and.returnValue(of([]));
    api.criarProposta.and.returnValue(of({ id: 60, cotacao: 7, cotacao_fornecedor: 50, data_proposta: '2026-08-21', total_itens: '19.00', total_proposta: '31.00', itens: [] } as any));
    api.atualizarProposta.and.returnValue(of({ id: 60, cotacao: 7, cotacao_fornecedor: 50, data_proposta: '2026-08-21', total_itens: '20.00', total_proposta: '20.00', itens: [] } as any));
    api.comparativo.and.returnValue(of({ cotacao: 7, itens: [{ id: 10, descricao: 'Item', quantidade_cotar: '1.000' }], propostas: [{ proposta: 60, cotacao_fornecedor: 50, fornecedor: 40, fornecedor_nome: 'Fornecedor A', total_itens: '19.00', desconto_geral: '0.00', frete: '0.00', outras_despesas: '0.00', total_geral: '19.00', menor_total_geral: true, diferenca_percentual: '0.00', economia_vs_mais_cara: '0.00', prazo_entrega: '5', melhor_prazo: true, condicao_pagamento: '30 dias', validade_proposta: '2026-09-01', itens: [{ cotacao_item: 10, descricao: 'Item', quantidade_cotar: '1.000', sem_oferta: false, quantidade_ofertada: '1.000', preco_unitario: '19.00', desconto_item: '0.00', custo_final_item: '19.00', menor_preco_unitario: true, menor_custo_final: true }] }] } as any));
    api.selecionarVencedor.and.returnValue(of({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO', proposta_vencedora: 60, justificativa_vencedor: 'Melhor condição' } as any));
    api.enviarAprovacao.and.returnValue(of({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'AGUARDANDO_APROVACAO', proposta_vencedora: 60 } as any));
    api.aprovar.and.returnValue(of({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'PEDIDO_GERADO', proposta_vencedora: 60, pedido_compra_gerado_id: 99 } as any));
    api.rejeitar.and.returnValue(of({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'REJEITADA', proposta_vencedora: 60, motivo_rejeicao: 'Revisar' } as any));
    api.cancelar.and.returnValue(of({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'CANCELADA', motivo_cancelamento: 'Compra suspensa' } as any));
    fornecedoresApi.list.and.returnValue(of({ count: 2, next: null, previous: null, results: [{ id: 40, nome_fornecedor: 'Fornecedor A' }, { id: 41, nome_fornecedor: 'Fornecedor B' }] as any }));
    api.apoioDecisaoItem.and.returnValue(of({ cotacao_item: 10, produto: 5, necessidade_aberta: '6.000', estoque_atual: '7.000', pedidos_pendentes: '4.000', ultimas_compras: [{ data: '2026-08-21', quantidade: '10.000', preco_unitario: '2.80', fornecedor: 'Fornecedor A' }], media_quantidades_ultimas_compras: '10.000', ultimo_preco: '2.80', preco_medio: '2.80', quantidade_cotar: '1.000' }));
    api.requisicoesDisponiveis.and.returnValue(of([
      { id: 20, numero: 123, loja: 2, loja_nome: 'Loja A', setor_nome: 'TI', requisitante_nome: 'joao', quantidade_itens: 1, data_requisicao: '2026-08-21', prioridade: 'NORMAL', itens: [{ descricao: 'Item req', qtd_solicitada: '1.000' }] },
      { id: 21, numero: 124, loja: 2, loja_nome: 'Loja A', setor_nome: 'Adm', requisitante_nome: 'maria', quantidade_itens: 1, data_requisicao: '2026-08-21', prioridade: 'URGENTE', itens: [] },
    ] as any));
    api.necessidades.and.returnValue(of([
      { key: 'produto:5', produto: 5, nome: 'Produto A', quantidade_total_solicitada: '3.000', quantidade_pendente: '3.000', numero_requisicoes: 2, requisicoes_ids: [20, 21], lojas: ['Loja A'], setores: ['TI'], origens: [{ requisicao: 20, numero: 123, loja_nome: 'Loja A', setor_nome: 'TI', quantidade_solicitada: '1.000', quantidade_pendente: '1.000' }] },
    ] as any));
    api.adicionarRequisicoes.and.returnValue(of({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO', requisicoes_vinculadas: [{ id: 1, cotacao: 7, requisicao: 20, requisicao_numero: 123 }] } as any));
    api.removerRequisicao.and.returnValue(of({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO', requisicoes_vinculadas: [] } as any));
    auth.podeAcessarModulo.and.returnValue(true);
    auth.podeProcesso.and.returnValue(true);
    auth.getCurrentUser.and.returnValue({ id: 3, username: 'cotador', empresa: { id: 1, nome: 'Empresa A' } } as any);

    await TestBed.configureTestingModule({
      imports: [CotacoesComponent],
      providers: [
        { provide: CotacoesService, useValue: api },
        { provide: FornecedoresService, useValue: fornecedoresApi },
        { provide: RequisicoesService, useValue: requisicoesApi },
        { provide: AuthService, useValue: auth },
        { provide: ProdutosService, useValue: { list: () => of([{ Idproduto: 5, descricao: 'Produto A', unidade: 4 }]) } },
        { provide: UnidadesService, useValue: { list: () => of([{ Idunidade: 4, Descricao: 'UN' }]) } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CotacoesComponent);
    component = fixture.componentInstance;
  });

  it('carrega listagem e lojas permitidas', () => {
    component.ngOnInit();
    expect(api.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page_size: 500 }));
    expect(requisicoesApi.lojasPermitidas).toHaveBeenCalled();
    expect(component.cotacoes.length).toBe(1);
    expect(component.lojas[0].label).toContain('Loja A');
  });

  it('seleciona automaticamente loja unica e habilita salvar', () => {
    component.ngOnInit();
    component.nova();
    expect(component.form.value.loja).toBe(2);
    expect(component.form.valid).toBeTrue();
  });

  it('exibe Nova Cotacao conforme EDIT', () => {
    auth.podeAcessarModulo.and.returnValue(true);
    expect(component.podeEditar).toBeTrue();
    auth.podeAcessarModulo.and.returnValue(false);
    expect(component.podeEditar).toBeFalse();
  });

  it('salva cabecalho novo', () => {
    component.nova();
    component.form.patchValue({ loja: 2, tipo_compra: 'USO_CONSUMO', prioridade: 'URGENTE', observacao: 'Teste' });
    component.salvar();
    expect(api.criar).toHaveBeenCalledWith(jasmine.objectContaining({ loja: 2, tipo_compra: 'USO_CONSUMO', prioridade: 'URGENTE', observacao: 'Teste' }));
    expect(component.atual?.id).toBe(8);
    expect(component.view).toBe('form');
    expect(api.listarItens).toHaveBeenCalledWith(8);
    expect(api.listarFornecedores).toHaveBeenCalledWith(8);
    expect(api.comparativo).toHaveBeenCalledWith(8);
  });

  it('mantem cotacao aberta sem erro quando comparativo ainda nao existe', () => {
    api.comparativo.and.returnValue(throwError(() => ({ status: 404, error: { detail: 'Não encontrado.' } })));
    component.nova();
    component.form.patchValue({ loja: 2, tipo_compra: 'USO_CONSUMO', prioridade: 'URGENTE' });
    component.salvar();
    expect(component.atual?.id).toBe(8);
    expect(component.view).toBe('form');
    expect(component.errorMsg).toBe('');
    expect(component.comparativoCotacao).toEqual({ cotacao: 8, itens: [], propostas: [] });
  });

  it('salva edicao de cabecalho em elaboracao', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.form.patchValue({ prioridade: 'URGENTE' });
    component.salvar();
    expect(api.atualizar).toHaveBeenCalledWith(7, jasmine.objectContaining({ prioridade: 'URGENTE' }));
  });

  it('alterna Produto e Avulso preenchendo dados do produto', () => {
    component.ngOnInit();
    component.itemForm.patchValue({ modo: 'PRODUTO', produto: 5 });
    component.produtoSelecionado();
    expect(component.itemForm.value.descricao).toBe('Produto A');
    expect(component.itemForm.value.unidade).toBe(4);
    component.itemForm.patchValue({ modo: 'AVULSO', produto: null, descricao: 'Livre' });
    expect(component.itemForm.value.descricao).toBe('Livre');
  });

  it('adiciona item', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    api.listarItens.and.returnValue(of([{ id: 10, cotacao: 7, origem: 'AVULSO', descricao: 'Item', quantidade_cotar: '1.000', unidade: 4, permite_alternativo: true } as any, { id: 11, cotacao: 7, origem: 'AVULSO', descricao: 'Novo', quantidade_cotar: '2.000', unidade: 4, permite_alternativo: true } as any]));
    component.itemForm.patchValue({ modo: 'AVULSO', descricao: 'Novo', quantidade_cotar: 2, unidade: 4 });
    component.salvarItem();
    expect(api.criarItem).toHaveBeenCalledWith(jasmine.objectContaining({ cotacao: 7, descricao: 'Novo', quantidade_cotar: 2, unidade: 4 }));
    expect(component.itens.some(item => item.id === 11 && item.descricao === 'Novo')).toBeTrue();
    expect(component.errorMsg).toBe('');
  });

  it('adiciona produto cadastrado com contrato de campos correto', () => {
    component.ngOnInit();
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    api.listarItens.and.returnValue(of([{ id: 12, cotacao: 7, origem: 'AVULSO', produto: 5, produto_descricao: 'Produto A', descricao: 'Produto A', quantidade_cotar: '1.000', unidade: 4, unidade_descricao: 'UN', permite_alternativo: true } as any]));
    component.itemForm.patchValue({ modo: 'PRODUTO', produto: 5, quantidade_cotar: 1 });
    component.produtoSelecionado();
    component.salvarItem();
    expect(api.criarItem).toHaveBeenCalledWith(jasmine.objectContaining({ cotacao: 7, produto: 5, descricao: '', quantidade_cotar: 1, unidade: 4 }));
    expect(component.itens[0].produto_descricao).toBe('Produto A');
  });

  it('estado vazio opcional de itens e fornecedores nao gera erro global', () => {
    api.listarItens.and.returnValue(throwError(() => ({ status: 404, error: { detail: 'Não encontrado.' } })));
    api.listarFornecedores.and.returnValue(throwError(() => ({ status: 404, error: { detail: 'Não encontrado.' } })));
    component.loadItens(7);
    component.loadFornecedoresCotacao(7);
    expect(component.itens).toEqual([]);
    expect(component.fornecedoresCotacao).toEqual([]);
    expect(component.errorMsg).toBe('');
  });

  it('edita item', () => {
    const item = { id: 10, cotacao: 7, origem: 'AVULSO', descricao: 'Item', quantidade_cotar: '1.000', unidade: 4, permite_alternativo: true } as any;
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.editarItem(item);
    component.itemForm.patchValue({ descricao: 'Editado' });
    component.salvarItem();
    expect(api.atualizarItem).toHaveBeenCalledWith(10, jasmine.objectContaining({ descricao: 'Editado' }));
  });

  it('exclui item e bloqueia visual fora de elaboracao', () => {
    const aberta = { id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'ABERTA' } as any;
    component.abrir(aberta);
    expect(component.podeEditarItens).toBeFalse();
    component.excluirItem({ id: 10 } as any);
    expect(api.excluirItem).not.toHaveBeenCalled();
    component.abrir({ ...aberta, status: 'EM_ELABORACAO' });
    component.excluirItem({ id: 10 } as any);
    expect(api.excluirItem).toHaveBeenCalledWith(10);
  });

  it('abre modal, seleciona uma e adiciona a cotacao', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.abrirModalRequisicoes();
    expect(component.modalRequisicoesAberto).toBeTrue();
    expect(component.requisicoesDisponiveis.length).toBe(2);
    component.toggleRequisicao(component.requisicoesDisponiveis[0], true);
    component.adicionarRequisicoes();
    expect(api.adicionarRequisicoes).toHaveBeenCalledWith(7, [20]);
  });

  it('seleciona varias requisicoes', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.abrirModalRequisicoes();
    component.toggleRequisicao(component.requisicoesDisponiveis[0], true);
    component.toggleRequisicao(component.requisicoesDisponiveis[1], true);
    component.adicionarRequisicoes();
    expect(api.adicionarRequisicoes).toHaveBeenCalledWith(7, [20, 21]);
  });

  it('expande requisicao para visualizar itens e exibe origem', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.abrirModalRequisicoes();
    component.toggleExpandir(component.requisicoesDisponiveis[0]);
    expect(component.requisicoesExpandidas.has(20)).toBeTrue();
    expect(component.origemItem({ origem: 'REQUISICAO', requisicao_origem_numero: 123 } as any)).toBe('REQ-123');
    expect(component.origemItem({ origem: 'AVULSO' } as any)).toBe('Avulso');
  });

  it('remove vinculo de requisicao', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.removerRequisicao(20);
    expect(api.removerRequisicao).toHaveBeenCalledWith(7, 20);
  });

  it('carrega apoio de decisao do item', () => {
    const item = { id: 10, cotacao: 7, origem: 'AVULSO', descricao: 'Item', quantidade_cotar: '1.000', unidade: 4, permite_alternativo: true } as any;
    component.toggleApoioItem(item);
    expect(api.apoioDecisaoItem).toHaveBeenCalledWith(10);
    expect(component.apoioExpandido.has(10)).toBeTrue();
    expect(component.apoioItens[10].estoque_atual).toBe('7.000');
  });

  it('abre visao de necessidades', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.abrirModalNecessidades();
    expect(component.modalNecessidadesAberto).toBeTrue();
    expect(api.necessidades).toHaveBeenCalled();
    expect(component.necessidades.length).toBe(1);
  });

  it('filtra categoria na visao de necessidades', () => {
    component.filtroNecessidades.categoria = '30';
    component.loadNecessidades();
    expect(api.necessidades).toHaveBeenCalledWith(jasmine.objectContaining({ categoria: '30' }));
  });

  it('expande origens e adiciona requisicoes pela necessidade', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.abrirModalNecessidades();
    const row = component.necessidades[0];
    component.toggleNecessidade(row);
    expect(component.necessidadesExpandidas.has(row.key)).toBeTrue();
    component.selecionarRequisicoesDaNecessidade(row);
    component.adicionarRequisicoes();
    expect(api.adicionarRequisicoes).toHaveBeenCalledWith(7, [20, 21]);
  });

  it('adiciona fornecedor', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.abrirModalFornecedor();
    api.listarFornecedores.and.returnValue(of([{ id: 50, cotacao: 7, fornecedor: 40, fornecedor_nome: 'Fornecedor A', status_participacao: 'CONVIDADO', observacao: '' } as any, { id: 51, cotacao: 7, fornecedor: 41, fornecedor_nome: 'Fornecedor B', status_participacao: 'CONVIDADO' } as any]));
    component.fornecedorSelecionado = 41;
    component.salvarFornecedor();
    expect(api.adicionarFornecedor).toHaveBeenCalledWith(jasmine.objectContaining({ cotacao: 7, fornecedor: 41, status_participacao: 'CONVIDADO' }));
    expect(component.fornecedoresCotacao.some(f => f.id === 51 && f.fornecedor === 41)).toBeTrue();
    expect(component.errorMsg).toBe('');
  });

  it('reabre cotacao com itens e fornecedores sem mensagens falsas de erro', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    expect(component.itens.length).toBe(1);
    expect(component.fornecedoresCotacao.length).toBe(1);
    expect(component.errorMsg).toBe('');
  });

  it('impede duplicado visualmente na lista de fornecedores', () => {
    component.fornecedoresCotacao = [{ id: 50, cotacao: 7, fornecedor: 40, fornecedor_nome: 'Fornecedor A', status_participacao: 'CONVIDADO' } as any];
    component.fornecedoresDisponiveis = [{ id: 40, nome_fornecedor: 'Fornecedor A' } as any, { id: 41, nome_fornecedor: 'Fornecedor B' } as any];
    expect(component.fornecedoresParaAdicionar().map(f => f.id)).toEqual([41]);
  });

  it('altera status de fornecedor', () => {
    const row = { id: 50, cotacao: 7, fornecedor: 40, fornecedor_nome: 'Fornecedor A', status_participacao: 'CONVIDADO' } as any;
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.abrirModalFornecedor(row);
    component.fornecedorStatus = 'RECUSOU';
    component.salvarFornecedor();
    expect(api.atualizarFornecedor).toHaveBeenCalledWith(50, jasmine.objectContaining({ status_participacao: 'RECUSOU' }));
  });

  it('exige motivo ao desclassificar fornecedor', () => {
    const row = { id: 50, cotacao: 7, fornecedor: 40, fornecedor_nome: 'Fornecedor A', status_participacao: 'CONVIDADO' } as any;
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.abrirModalFornecedor(row);
    component.fornecedorStatus = 'DESCLASSIFICADO';
    component.fornecedorMotivo = '';
    component.salvarFornecedor();
    expect(api.atualizarFornecedor).not.toHaveBeenCalled();
    expect(component.errorMsg).toContain('motivo');
  });

  it('remove fornecedor', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.removerFornecedor({ id: 50 } as any);
    expect(api.removerFornecedor).toHaveBeenCalledWith(50);
  });

  it('abre proposta e preenche cabecalho', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.abrirModalProposta({ id: 50, cotacao: 7, fornecedor: 40, fornecedor_nome: 'Fornecedor A', status_participacao: 'CONVIDADO' } as any);
    component.propostaHeader.condicao_pagamento = '30 dias';
    expect(component.modalPropostaAberto).toBeTrue();
    expect(component.propostaHeader.condicao_pagamento).toBe('30 dias');
  });

  it('preenche itens, deixa item sem oferta e calcula total', () => {
    component.itens = [
      { id: 10, cotacao: 7, descricao: 'Item A', quantidade_cotar: '2.000', unidade: 4, origem: 'AVULSO', permite_alternativo: true } as any,
      { id: 11, cotacao: 7, descricao: 'Item B', quantidade_cotar: '1.000', unidade: 4, origem: 'AVULSO', permite_alternativo: true } as any,
    ];
    component.atual = { id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any;
    component.abrirModalProposta({ id: 50, cotacao: 7, fornecedor: 40, fornecedor_nome: 'Fornecedor A', status_participacao: 'CONVIDADO' } as any);
    component.propostaItens[0].quantidade_ofertada = 2;
    component.propostaItens[0].preco_unitario = 10;
    component.propostaItens[0].desconto_item = 1;
    component.propostaHeader.frete = 10;
    component.propostaHeader.outras_despesas = 5;
    component.propostaHeader.desconto_geral = 3;
    expect(component.totalItemProposta(component.propostaItens[0])).toBe(19);
    expect(component.totalProposta()).toBe(31);
    component.salvarProposta();
    expect(api.criarProposta).toHaveBeenCalledWith(jasmine.objectContaining({ itens: [jasmine.objectContaining({ cotacao_item: 10 })] }));
  });

  it('edita proposta existente', () => {
    component.itens = [{ id: 10, cotacao: 7, descricao: 'Item A', quantidade_cotar: '2.000', unidade: 4, origem: 'AVULSO', permite_alternativo: true } as any];
    component.atual = { id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any;
    component.propostasPorFornecedor[50] = { id: 60, cotacao: 7, cotacao_fornecedor: 50, data_proposta: '2026-08-21', frete: '1.00', itens: [{ cotacao_item: 10, quantidade_ofertada: '1.000', preco_unitario: '2.00' }] } as any;
    component.abrirModalProposta({ id: 50, cotacao: 7, fornecedor: 40, fornecedor_nome: 'Fornecedor A', status_participacao: 'PROPOSTA_RECEBIDA' } as any);
    component.propostaHeader.frete = 2;
    component.salvarProposta();
    expect(api.atualizarProposta).toHaveBeenCalledWith(60, jasmine.objectContaining({ frete: 2 }));
  });

  it('renderiza comparativo com totais e destaques', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    expect(api.comparativo).toHaveBeenCalledWith(7);
    expect(component.comparativoCotacao?.propostas[0].menor_total_geral).toBeTrue();
    expect(component.comparativoCotacao?.propostas[0].itens[0].menor_preco_unitario).toBeTrue();
    component.abrirModalComparativoCotacao();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Comparativo de propostas');
    expect(text).toContain('Fornecedor A');
    expect(text).toContain('Total: R$');
    expect(text).toContain('19,00');
  });

  it('mostra Sem oferta no comparativo', () => {
    api.comparativo.and.returnValue(of({ cotacao: 7, itens: [{ id: 10, descricao: 'Item', quantidade_cotar: '1.000' }], propostas: [{ proposta: 60, cotacao_fornecedor: 50, fornecedor: 40, fornecedor_nome: 'Fornecedor A', total_itens: '0.00', desconto_geral: '0.00', frete: '0.00', outras_despesas: '0.00', total_geral: '0.00', menor_total_geral: true, diferenca_percentual: '0.00', economia_vs_mais_cara: '0.00', itens: [{ cotacao_item: 10, descricao: 'Item', quantidade_cotar: '1.000', sem_oferta: true, preco_unitario: null, custo_final_item: null }] }] } as any));
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    component.abrirModalComparativoCotacao();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sem oferta');
  });

  it('abre e fecha sobretelas da cotacao mantendo conteudo fora da tela principal', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    fixture.detectChanges();
    let text = fixture.nativeElement.textContent;
    expect(text).toContain('Itens da Cotação');
    expect(text).toContain('Fornecedores consultados');
    expect(text).toContain('Comparativo de propostas');
    expect(text).not.toContain('Produto cadastrado');
    expect(text).not.toContain('Registrar proposta');

    component.abrirModalItensCotacao();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Produto cadastrado');
    expect(fixture.nativeElement.textContent).toContain('Adicionar Item');
    component.fecharModalItensCotacao();

    component.abrirModalFornecedoresCotacao();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Registrar proposta');
    component.fecharModalFornecedoresCotacao();

    component.abrirModalComparativoCotacao();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Total: R$');
    component.fecharModalComparativoCotacao();
    fixture.detectChanges();
    text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Produto cadastrado');
    expect(text).not.toContain('Registrar proposta');
  });

  it('seleciona vencedor exigindo justificativa quando obrigatoria', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    const proposta = component.comparativoCotacao!.propostas[0];
    component.justificativaVencedor = '';
    component.selecionarVencedor(proposta);
    expect(api.selecionarVencedor).not.toHaveBeenCalled();
    component.justificativaVencedor = 'Melhor condição';
    component.selecionarVencedor(proposta);
    expect(api.selecionarVencedor).toHaveBeenCalledWith(7, 60, 'Melhor condição');
  });

  it('envia para aprovacao e mostra aprovar rejeitar conforme perfil', () => {
    component.atual = { id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO', proposta_vencedora: 60 } as any;
    component.enviarAprovacao();
    expect(api.enviarAprovacao).toHaveBeenCalledWith(7);
    expect(component.atual?.status).toBe('AGUARDANDO_APROVACAO');
    expect(component.podeAprovarCotacao).toBeTrue();
  });

  it('aprova rejeita e bloqueia edicao apos aprovacao', () => {
    component.atual = { id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'AGUARDANDO_APROVACAO', proposta_vencedora: 60 } as any;
    component.aprovarCotacao();
    expect(api.aprovar).toHaveBeenCalledWith(7);
    expect(component.atual?.status).toBe('PEDIDO_GERADO');
    expect(component.podeEditarFornecedores).toBeFalse();
    expect(component.podeEditarItens).toBeFalse();
    component.atual = { ...component.atual, status: 'AGUARDANDO_APROVACAO' } as any;
    component.motivoRejeicao = 'Revisar';
    component.rejeitarCotacao();
    expect(api.rejeitar).toHaveBeenCalledWith(7, 'Revisar');
  });

  it('mostra pedido gerado e link para pedido de compra', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'PEDIDO_GERADO', pedido_compra_gerado_id: 99 } as any);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Pedido de Compra gerado: 99');
    expect(text).toContain('Ver Pedido de Compra');
  });

  it('botao cancelar abre modal e exige motivo', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'EM_ELABORACAO' } as any);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cancelar Cotação');
    component.abrirModalCancelar();
    expect(component.modalCancelarAberto).toBeTrue();
    component.motivoCancelamento = '';
    component.cancelarCotacao();
    expect(api.cancelar).not.toHaveBeenCalled();
    component.motivoCancelamento = 'Compra suspensa';
    component.cancelarCotacao();
    expect(api.cancelar).toHaveBeenCalledWith(7, 'Compra suspensa');
    expect(component.atual?.status).toBe('CANCELADA');
  });

  it('estado cancelada bloqueia edicao visual', () => {
    component.abrir({ id: 7, numero: 1, empresa: 1, loja: 2, responsavel: 3, data_abertura: '2026-08-21', prioridade: 'NORMAL', tipo_compra: 'OUTRO', status: 'CANCELADA' } as any);
    expect(component.podeEditarItens).toBeFalse();
    expect(component.podeEditarFornecedores).toBeFalse();
    expect(component.podeCancelarCotacao).toBeFalse();
  });
});
