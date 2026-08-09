import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { Fornecedor } from '../../core/models/fornecedor';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { FornecedoresComponent } from './fornecedores.component';

describe('FornecedoresComponent', () => {
  let fixture: ComponentFixture<FornecedoresComponent>;
  let component: FornecedoresComponent;

  const fornecedor: Fornecedor = {
    id: 1,
    nome_fornecedor: 'Fornecedor Alpha',
    tipo_pessoa: 'PJ' as const,
    documento: '11222333000181',
    categorias: ['MATERIA_PRIMA', 'AVIAMENTO'],
    categorias_lista: ['MATERIA_PRIMA', 'AVIAMENTO'],
    ativo: true,
    bloqueio: false,
    total_comprado: '100.00',
    quantidade_compras: 2,
    ticket_medio: '50.00',
    saldo_a_pagar: '70.00',
    dados_bancarios_ocultos: false,
  };

  const api = {
    list: jasmine.createSpy('list'),
    indicadores: jasmine.createSpy('indicadores'),
    get: jasmine.createSpy('get'),
    create: jasmine.createSpy('create'),
    update: jasmine.createSpy('update'),
    remove: jasmine.createSpy('remove'),
    possiveisDuplicados: jasmine.createSpy('possiveisDuplicados'),
    contatos: jasmine.createSpy('contatos'),
    criarContato: jasmine.createSpy('criarContato'),
    atualizarContato: jasmine.createSpy('atualizarContato'),
    inativarContato: jasmine.createSpy('inativarContato'),
    reativarContato: jasmine.createSpy('reativarContato'),
    enderecos: jasmine.createSpy('enderecos'),
    criarEndereco: jasmine.createSpy('criarEndereco'),
    atualizarEndereco: jasmine.createSpy('atualizarEndereco'),
    inativarEndereco: jasmine.createSpy('inativarEndereco'),
    reativarEndereco: jasmine.createSpy('reativarEndereco'),
    compras: jasmine.createSpy('compras'),
    financeiro: jasmine.createSpy('financeiro'),
    historico: jasmine.createSpy('historico'),
    ativar: jasmine.createSpy('ativar'),
    inativar: jasmine.createSpy('inativar'),
    bloquear: jasmine.createSpy('bloquear'),
    desbloquear: jasmine.createSpy('desbloquear'),
  };
  const auth = {
    podeAcessarModulo: jasmine.createSpy('podeAcessarModulo').and.returnValue(true),
    podeExcluirModulo: jasmine.createSpy('podeExcluirModulo').and.returnValue(true),
  };

  beforeEach(async () => {
    api.list.and.returnValue(of({ count: 1, next: null, previous: null, results: [fornecedor] }));
    api.indicadores.and.returnValue(of({ total: 10, ativos: 8, bloqueados: 1, saldo_a_pagar: '70.00' }));
    api.get.and.returnValue(of(fornecedor));
    api.contatos.and.returnValue(of([{ id: 3, nome: 'Ana', tipo: 'COMERCIAL', principal: true, ativo: true }]));
    api.enderecos.and.returnValue(of([{ id: 4, tipo: 'FISCAL', endereco: 'Rua A', principal: true, ativo: true }]));
    api.compras.and.returnValue(of({ count: 1, next: null, previous: null, results: [{ id: 1, data: '2026-01-01', total: '100.00' }] }));
    api.financeiro.and.returnValue(of({ count: 1, next: null, previous: null, results: [{ id: 1, titulo: 'T1', saldo: '70.00' }] }));
    api.historico.and.returnValue(of({ count: 1, next: null, previous: null, results: [{ id: 1, created_at: '', acao: 'SUPPLIER_UPDATED', acao_descricao: 'Fornecedor atualizado' }] }));
    api.create.and.returnValue(of(fornecedor));
    api.update.and.returnValue(of(fornecedor));
    api.remove.and.returnValue(of({}));
    api.possiveisDuplicados.and.returnValue(of([]));
    api.criarContato.and.returnValue(of({ id: 5, nome: 'Bruno' }));
    api.atualizarContato.and.returnValue(of({ id: 3, nome: 'Ana' }));
    api.inativarContato.and.returnValue(of({ id: 3, nome: 'Ana', ativo: false }));
    api.reativarContato.and.returnValue(of({ id: 3, nome: 'Ana', ativo: true }));
    api.criarEndereco.and.returnValue(of({ id: 6, endereco: 'Rua B' }));
    api.atualizarEndereco.and.returnValue(of({ id: 4, endereco: 'Rua A' }));
    api.inativarEndereco.and.returnValue(of({ id: 4, endereco: 'Rua A', ativo: false }));
    api.reativarEndereco.and.returnValue(of({ id: 4, endereco: 'Rua A', ativo: true }));
    api.ativar.and.returnValue(of({ ...fornecedor, ativo: true }));
    api.inativar.and.returnValue(of({ ...fornecedor, ativo: false }));
    api.bloquear.and.returnValue(of({ ...fornecedor, bloqueio: true }));
    api.desbloquear.and.returnValue(of({ ...fornecedor, bloqueio: false }));

    await TestBed.configureTestingModule({
      imports: [FornecedoresComponent],
      providers: [
        provideRouter([]),
        { provide: FornecedoresService, useValue: api },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FornecedoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carrega lista paginada e indicadores do backend', () => {
    expect(api.list).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, page_size: 20 }));
    expect(api.indicadores).toHaveBeenCalled();
    expect(component.fornecedores.length).toBe(1);
    expect(component.indicadores.total).toBe(10);
  });

  it('mudanca de pagina e page_size chamam backend', () => {
    component.total = 40;
    component.nextPage();
    expect(api.list).toHaveBeenCalledWith(jasmine.objectContaining({ page: 2 }));
    component.onPageSizeChange('50');
    expect(api.list).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, page_size: 50 }));
  });

  it('envia pesquisa e filtros ao backend', () => {
    component.search = 'Alpha';
    component.filterTipoPessoa = 'PJ';
    component.filterCategoria = 'AVIAMENTO';
    component.filterDocumento = '11.222.333/0001-81';
    component.filterCidade = 'São Paulo';
    component.filterEstado = 'sp';
    component.filterStatus = 'BLOQUEADO';
    component.doSearch();
    expect(api.list).toHaveBeenCalledWith(jasmine.objectContaining({
      search: 'Alpha',
      tipo_pessoa: 'PJ',
      categoria: 'AVIAMENTO',
      documento: '11222333000181',
      cidade: 'São Paulo',
      estado: 'SP',
      bloqueio: true,
    }));
  });

  it('aceita PF, PJ e fornecedor sem documento', () => {
    component.novo();
    component.form.patchValue({ nome_fornecedor: 'Pessoa Física', tipo_pessoa: 'PF', documento: '52998224725' });
    component.salvar();
    expect(api.create).toHaveBeenCalledWith(jasmine.objectContaining({ tipo_pessoa: 'PF', documento: '52998224725' }));

    component.novo();
    component.form.patchValue({ nome_fornecedor: 'Sem Documento', tipo_pessoa: 'PJ', documento: '' });
    component.salvar();
    expect(api.create).toHaveBeenCalledWith(jasmine.objectContaining({ documento: null }));
  });

  it('envia categorias multiplas', () => {
    component.novo();
    component.form.patchValue({ nome_fornecedor: 'Multi', tipo_pessoa: 'PJ' });
    component.toggleCategoria('MATERIA_PRIMA', true);
    component.toggleCategoria('AVIAMENTO', true);
    component.salvar();
    expect(api.create).toHaveBeenCalledWith(jasmine.objectContaining({ categorias: ['MATERIA_PRIMA', 'AVIAMENTO'] }));
  });

  it('mostra duplicidade e permite continuar', () => {
    api.possiveisDuplicados.and.returnValue(of([fornecedor]));
    component.novo();
    component.form.patchValue({ nome_fornecedor: 'Fornecedor Alpha' });
    component.salvar();
    expect(component.duplicateModal).toBeTrue();
    component.continuarMesmoDuplicado();
    expect(api.create).toHaveBeenCalled();
  });

  it('carrega consulta com abas dados, compras, financeiro e historico', () => {
    component.consultar(fornecedor);
    component.selecionarTab('compras');
    component.selecionarTab('financeiro');
    component.selecionarTab('historico');
    expect(api.get).toHaveBeenCalledWith(1);
    expect(api.contatos).toHaveBeenCalledWith(1);
    expect(api.enderecos).toHaveBeenCalledWith(1);
    expect(api.compras).toHaveBeenCalled();
    expect(api.financeiro).toHaveBeenCalled();
    expect(api.historico).toHaveBeenCalled();
  });

  it('salva contatos e respeita principal no payload', () => {
    component.editar(fornecedor);
    component.contatoForm.patchValue({ nome: 'Bruno', tipo: 'COMERCIAL', principal: true });
    component.salvarContato();
    expect(api.criarContato).toHaveBeenCalledWith(1, jasmine.objectContaining({ tipo: 'COMERCIAL', principal: true }));
  });

  it('salva enderecos e respeita principal no payload', () => {
    component.editar(fornecedor);
    component.enderecoForm.patchValue({ endereco: 'Rua B', tipo: 'FISCAL', principal: true });
    component.salvarEndereco();
    expect(api.criarEndereco).toHaveBeenCalledWith(1, jasmine.objectContaining({ tipo: 'FISCAL', principal: true }));
  });

  it('protege dados bancarios quando backend indica ocultacao', () => {
    api.get.and.returnValue(of({ ...fornecedor, dados_bancarios_ocultos: true, banco: null }));
    component.editar(fornecedor);
    expect(component.form.get('banco')?.disabled).toBeTrue();
  });

  it('permite editar dados bancarios quando autorizado', () => {
    component.editar(fornecedor);
    component.form.patchValue({ nome_fornecedor: 'Fornecedor Alpha', banco: 'Banco' });
    component.salvar();
    expect(api.update).toHaveBeenCalledWith(1, jasmine.objectContaining({ banco: 'Banco' }));
  });

  it('executa lifecycle com modal de bloqueio', () => {
    component.selectedFornecedor = fornecedor;
    component.ativarSelecionado();
    component.inativarSelecionado();
    component.abrirBloqueio();
    component.bloqueioForm.patchValue({ motivo: 'Restrição' });
    component.confirmarBloqueio();
    component.abrirDesbloqueio();
    component.confirmarDesbloqueio();
    expect(api.ativar).toHaveBeenCalledWith(1);
    expect(api.inativar).toHaveBeenCalledWith(1);
    expect(api.bloquear).toHaveBeenCalledWith(1, jasmine.objectContaining({ motivo: 'Restrição' }));
    expect(api.desbloquear).toHaveBeenCalledWith(1);
  });

  it('exibe mensagem real da API em exclusao negada', () => {
    api.remove.and.returnValue(throwError(() => ({ error: { detail: 'Este fornecedor possui compras ou outros registros vinculados e não pode ser excluído. Utilize a inativação.' } })));
    component.excluir(fornecedor);
    component.confirmarExclusao();
    expect(component.errorMsg).toContain('Utilize a inativação');
  });
});
