import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { Fornecedor } from '../../core/models/fornecedor';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';
import { PlanoContabilService } from '../../core/services/plano-contabil.service';
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
  const prazosApi = { listPrazos: jasmine.createSpy('listPrazos') };
  const planoApi = { list: jasmine.createSpy('planoList') };
  const naturezaApi = { list: jasmine.createSpy('naturezaList') };

  beforeEach(async () => {
    api.list.and.returnValue(of({ count: 1, next: null, previous: null, results: [fornecedor] }));
    api.indicadores.and.returnValue(of({ total: 10, ativos: 8, bloqueados: 1, saldo_a_pagar: '70.00' }));
    api.get.and.returnValue(of(fornecedor));
    api.contatos.and.returnValue(of([{ id: 3, nome: 'Ana', cargo_funcao: 'Vendedora', tipo: 'COMERCIAL', telefone: '21990087565', whatsapp: '21990087565', email: 'ana@teste.com', principal: true, ativo: true }]));
    api.enderecos.and.returnValue(of([{ id: 4, tipo: 'FISCAL', logradouro: 'Rua', endereco: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Rio', estado: 'RJ', cep: '20000000', principal: true, ativo: true }]));
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
    prazosApi.listPrazos.and.returnValue(of({ count: 1, results: [{ Idprazo: 7, codigo: '30', descricao: '30 dias', num_parcelas: 1, intervalo_dias: 30, ativo: true }] }));
    planoApi.list.and.returnValue(of({ count: 1, results: [{ id: 8, codigo: '2.1.01.001', descricao: 'Fornecedores Nacionais', classe: 'PASSIVO', natureza: 'CREDITO', analitica: true, ativa: true }] }));
    naturezaApi.list.and.returnValue(of({ count: 1, results: [{ idnatureza: 9, codigo: 'FORN', descricao: 'Pagamento fornecedor', categoria_principal: 'Financeiro', subcategoria: 'Fornecedores', tipo: 'DESPESA', status: 'ATIVO', tipo_natureza: 'DEBITO', ativo: true }] }));

    await TestBed.configureTestingModule({
      imports: [FornecedoresComponent],
      providers: [
        provideRouter([]),
        { provide: FornecedoresService, useValue: api },
        { provide: AuthService, useValue: auth },
        { provide: FormasPagamentoService, useValue: prazosApi },
        { provide: PlanoContabilService, useValue: planoApi },
        { provide: NatLancamentosService, useValue: naturezaApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FornecedoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carrega lista paginada e indicadores do backend', () => {
    expect(api.list).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, page_size: 20 }));
    expect(api.indicadores).toHaveBeenCalled();
    expect(prazosApi.listPrazos).toHaveBeenCalledWith({ ativo: true });
    expect(planoApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ ativa: true, analitica: true }));
    expect(naturezaApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ ativo: true }));
    expect(component.fornecedores.length).toBe(1);
    expect(component.indicadores.total).toBe(10);
  });

  it('usa selects para campos fiscais, financeiros e bancarios estruturados', () => {
    component.novo();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#icms-box select')).toBeTruthy();
    expect(el.querySelector('#prazo-box select')).toBeTruthy();
    expect(el.querySelector('#conta-contabil-box select')).toBeTruthy();
    expect(el.querySelector('#natureza-box select')).toBeTruthy();
    expect(el.querySelector('#tipo-conta-box select')).toBeTruthy();
    expect(el.textContent).toContain('Sim');
    expect(el.textContent).toContain('Não');
    expect(el.textContent).toContain('Isento');
    expect(el.textContent).toContain('Conta corrente');
    expect(el.textContent).toContain('Conta poupança');
    expect(el.textContent).toContain('Conta de pagamento');
    expect(el.textContent).toContain('Outra');
  });

  it('seleciona padroes estruturados e envia IDs corretos', () => {
    component.novo();
    component.form.patchValue({
      nome_fornecedor: 'Fornecedor Padroes',
      tipo_pessoa: 'PJ',
      contribuinte_icms: 'SIM',
      prazo_padrao_pagamento_ref: 7,
      conta_contabil_padrao: 8,
      natureza_padrao: 9,
      tipo_conta: 'CORRENTE',
    });
    component.salvar();
    expect(api.create).toHaveBeenCalledWith(jasmine.objectContaining({
      contribuinte_icms: 'SIM',
      prazo_padrao_pagamento_ref: 7,
      conta_contabil_padrao: 8,
      natureza_padrao: 9,
      tipo_conta: 'CORRENTE',
    }));
    expect(api.create.calls.mostRecent().args[0].prazo_padrao_pagamento).toBeUndefined();
    expect(api.create.calls.mostRecent().args[0].conta_contabil).toBeUndefined();
  });

  it('editar recupera valores persistidos e labels amigaveis de consulta', () => {
    api.get.and.returnValue(of({
      ...fornecedor,
      contribuinte_icms: 'ISENTO',
      contribuinte_icms_descricao: 'Isento',
      prazo_padrao_pagamento_ref: 7,
      prazo_padrao_descricao: '30 dias',
      conta_contabil_padrao: 8,
      conta_contabil_codigo: '2.1.01.001',
      conta_contabil_descricao: 'Fornecedores Nacionais',
      natureza_padrao: 9,
      natureza_padrao_codigo: 'FORN',
      natureza_padrao_descricao: 'Pagamento fornecedor',
      tipo_conta: 'POUPANCA',
      tipo_conta_descricao: 'Conta poupança',
    }));
    component.editar(fornecedor);
    expect(component.form.value.contribuinte_icms).toBe('ISENTO');
    expect(component.form.value.prazo_padrao_pagamento_ref).toBe(7);
    expect(component.form.value.conta_contabil_padrao).toBe(8);
    expect(component.form.value.natureza_padrao).toBe(9);
    expect(component.form.value.tipo_conta).toBe('POUPANCA');
    expect(component.contribuinteIcmsLabel(component.consultaFornecedor?.contribuinte_icms)).toBe('Isento');
    expect(component.fornecedorPrazoLabel(component.consultaFornecedor!)).toBe('30 dias');
    expect(component.fornecedorContaContabilLabel(component.consultaFornecedor!)).toBe('2.1.01.001 - Fornecedores Nacionais');
    expect(component.fornecedorNaturezaLabel(component.consultaFornecedor!)).toBe('FORN - Pagamento fornecedor');
    expect(component.tipoContaLabel(component.consultaFornecedor?.tipo_conta)).toBe('Conta poupança');
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
    api.contatos.calls.reset();
    component.editar(fornecedor);
    component.contatoForm.patchValue({ nome: 'Bruno', tipo: 'COMERCIAL', telefone: '(21) 99008-7565', whatsapp: '21 3324-4000', principal: true });
    component.salvarContato();
    expect(api.criarContato).toHaveBeenCalledWith(1, jasmine.objectContaining({ tipo: 'COMERCIAL', telefone: '21990087565', whatsapp: '2133244000', principal: true }));
    expect(api.contatos).toHaveBeenCalledWith(1);
    expect(component.successMsg).toBe('Contato salvo com sucesso.');
    expect(component.contatoForm.value.nome).toBeNull();
    expect(component.contatoEditingId).toBeNull();
  });

  it('salva enderecos e respeita principal no payload', () => {
    api.enderecos.calls.reset();
    component.editar(fornecedor);
    component.enderecoForm.patchValue({ endereco: 'Rua B', tipo: 'FISCAL', principal: true });
    component.salvarEndereco();
    expect(api.criarEndereco).toHaveBeenCalledWith(1, jasmine.objectContaining({ tipo: 'FISCAL', principal: true }));
    expect(api.enderecos).toHaveBeenCalledWith(1);
    expect(component.successMsg).toBe('Endereço salvo com sucesso.');
    expect(component.enderecoForm.value.endereco).toBeNull();
    expect(component.enderecoEditingId).toBeNull();
  });

  it('renderiza contatos cadastrados na consulta sem acoes de alteracao', () => {
    component.consultar(fornecedor);
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('.child-section')?.textContent || '';
    expect(text).toContain('Contatos cadastrados');
    expect(text).toContain('Ana');
    expect(text).toContain('Vendedora');
    expect(text).toContain('Comercial');
    expect(text).toContain('Principal');
    expect(text).toContain('Ativo');
    expect(text).not.toContain('Salvar contato');
  });

  it('renderiza enderecos cadastrados na consulta sem formulario', () => {
    component.consultar(fornecedor);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Endereços cadastrados');
    expect(text).toContain('Rua A');
    expect(text).toContain('Centro');
    expect(text).toContain('Rio/RJ');
    expect(text).not.toContain('Salvar endereço');
  });

  it('edita, inativa e reativa contato atualizando lista', () => {
    component.editar(fornecedor);
    component.editarContato({ id: 3, nome: 'Ana', tipo: 'COMERCIAL', telefone: '21990087565', whatsapp: '2133244000', principal: true, ativo: true });
    expect(component.contatoEditingId).toBe(3);
    expect(component.contatoForm.value.telefone).toBe('(21) 99008-7565');
    expect(component.contatoForm.value.whatsapp).toBe('(21) 3324-4000');
    component.contatoForm.patchValue({ nome: 'Ana Maria' });
    component.salvarContato();
    component.toggleContato({ id: 3, nome: 'Ana', ativo: true });
    component.toggleContato({ id: 3, nome: 'Ana', ativo: false });
    expect(api.atualizarContato).toHaveBeenCalledWith(1, 3, jasmine.objectContaining({ nome: 'Ana Maria' }));
    expect(api.inativarContato).toHaveBeenCalledWith(1, 3);
    expect(api.reativarContato).toHaveBeenCalledWith(1, 3);
  });

  it('edita, inativa e reativa endereco atualizando lista', () => {
    component.editar(fornecedor);
    component.editarEndereco({ id: 4, tipo: 'FISCAL', endereco: 'Rua A', principal: true, ativo: true });
    expect(component.enderecoEditingId).toBe(4);
    component.enderecoForm.patchValue({ endereco: 'Rua Nova' });
    component.salvarEndereco();
    component.toggleEndereco({ id: 4, endereco: 'Rua A', ativo: true });
    component.toggleEndereco({ id: 4, endereco: 'Rua A', ativo: false });
    expect(api.atualizarEndereco).toHaveBeenCalledWith(1, 4, jasmine.objectContaining({ endereco: 'Rua Nova' }));
    expect(api.inativarEndereco).toHaveBeenCalledWith(1, 4);
    expect(api.reativarEndereco).toHaveBeenCalledWith(1, 4);
  });

  it('valida telefone e whatsapp por quantidade de digitos', () => {
    const telefone = component.contatoForm.get('telefone')!;
    const whatsapp = component.contatoForm.get('whatsapp')!;

    telefone.setValue('');
    whatsapp.setValue('');
    expect(telefone.valid).toBeTrue();
    expect(whatsapp.valid).toBeTrue();

    telefone.setValue('2133244000');
    whatsapp.setValue('21990087565');
    expect(telefone.valid).toBeTrue();
    expect(whatsapp.valid).toBeTrue();

    telefone.setValue('213324400');
    whatsapp.setValue('219900875650');
    expect(telefone.hasError('phone')).toBeTrue();
    expect(whatsapp.hasError('phone')).toBeTrue();
  });

  it('formata telefone celular e fixo sem hifen apos DDD', () => {
    expect(component.formatPhone('21990087565')).toBe('(21) 99008-7565');
    expect(component.formatPhone('2133244000')).toBe('(21) 3324-4000');

    component.contatoForm.get('telefone')?.setValue('21990087565');
    component.onContatoPhoneInput('telefone');
    component.contatoForm.get('whatsapp')?.setValue('2133244000');
    component.onContatoPhoneInput('whatsapp');
    expect(component.contatoForm.value.telefone).toBe('(21) 99008-7565');
    expect(component.contatoForm.value.whatsapp).toBe('(21) 3324-4000');
  });

  it('nao chama API e mostra mensagem quando contato esta invalido', () => {
    api.criarContato.calls.reset();
    component.editar(fornecedor);
    component.contatoForm.patchValue({ nome: '', telefone: '123', whatsapp: '123456789012' });
    component.salvarContato();
    expect(api.criarContato).not.toHaveBeenCalled();
    expect(component.errorMsg).toContain('Nome do contato é obrigatório.');
    expect(component.errorMsg).toContain('Telefone inválido');
    expect(component.errorMsg).toContain('WhatsApp inválido');
  });

  it('telefone1 e telefone2 do fornecedor aceitam 10 e 11 digitos naturais', () => {
    component.form.get('telefone1')?.setValue('2133244000');
    component.form.get('telefone2')?.setValue('21990087565');
    expect(component.form.get('telefone1')?.valid).toBeTrue();
    expect(component.form.get('telefone2')?.valid).toBeTrue();
    component.onPhoneInput('telefone1');
    component.onPhoneInput('telefone2');
    expect(component.form.value.telefone1).toBe('(21) 3324-4000');
    expect(component.form.value.telefone2).toBe('(21) 99008-7565');
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
