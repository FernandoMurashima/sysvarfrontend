import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { ClientesComponent } from './clientes.component';
import { ClientesService } from '../../core/services/clientes.service';
import { AuthService } from '../../core/auth.service';
import { Cliente } from '../../core/models/clientes';

describe('ClientesComponent documento funcional', () => {
  let fixture: ComponentFixture<ClientesComponent>;
  let component: ClientesComponent;
  let api: jasmine.SpyObj<ClientesService>;

  const indicadores = {
    total: 0,
    ativos: 0,
    inativos: 0,
    bloqueados: 0,
    pessoas_fisicas: 0,
    pessoas_juridicas: 0,
    clientes_identificados: 0,
    cliente_padrao: 0,
    com_consentimento: 0,
    clientes_com_compras: 0,
    clientes_sem_compras: 0,
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj<ClientesService>('ClientesService', [
      'list', 'indicadores', 'get', 'create', 'update', 'patch', 'historico', 'compras',
      'ativar', 'inativar', 'bloquear', 'desbloquear', 'remove'
    ]);
    api.list.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    api.indicadores.and.returnValue(of(indicadores));
    api.get.and.returnValue(of({ id: 1, nome_cliente: 'Cliente' }));
    api.historico.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    api.compras.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    api.create.and.returnValue(of({ id: 1, nome_cliente: 'Cliente' }));
    api.update.and.returnValue(of({ id: 1, nome_cliente: 'Cliente' }));
    api.patch.and.returnValue(of({ id: 1, nome_cliente: 'Cliente' }));
    api.remove.and.returnValue(of({}));
    api.ativar.and.returnValue(of({ id: 31, nome_cliente: 'Cliente', ativo: true }));
    api.inativar.and.returnValue(of({ id: 31, nome_cliente: 'Cliente', ativo: false }));
    api.bloquear.and.returnValue(of({ id: 31, nome_cliente: 'Cliente', bloqueio: true }));
    api.desbloquear.and.returnValue(of({ id: 31, nome_cliente: 'Cliente', bloqueio: false }));

    await TestBed.configureTestingModule({
      imports: [ClientesComponent],
      providers: [
        { provide: ClientesService, useValue: api },
        { provide: AuthService, useValue: { podeAcessarModulo: () => true, podeExcluirModulo: () => true } },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function preencherBase(tipo: 'PF' | 'PJ', documento: string): void {
    component.novo();
    component.form.patchValue({
      nome_cliente: tipo === 'PJ' ? 'Empresa Cliente' : 'Maria Cliente',
      tipo_pessoa: tipo,
      documento,
    });
  }

  function ultimoPayloadCreate(): Cliente {
    return api.create.calls.mostRecent().args[0] as Cliente;
  }

  it('formulário não possui controle cpf e possui documento', () => {
    expect(component.form.get('cpf')).toBeNull();
    expect(component.form.get('documento')).toBeTruthy();
  });

  it('formulário não possui controles diretos de ativo e bloqueio', () => {
    expect(component.form.get('ativo')).toBeNull();
    expect(component.form.get('bloqueio')).toBeNull();
  });

  it('novo cliente PF envia somente documento no payload', () => {
    preencherBase('PF', '529.982.247-25');

    component.salvar();

    expect(ultimoPayloadCreate().documento).toBe('52998224725');
    expect(Object.prototype.hasOwnProperty.call(ultimoPayloadCreate(), 'cpf')).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(ultimoPayloadCreate(), 'ativo')).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(ultimoPayloadCreate(), 'bloqueio')).toBeFalse();
  });

  it('novo cliente PJ envia somente documento no payload', () => {
    preencherBase('PJ', '11.222.333/0001-81');

    component.salvar();

    expect(ultimoPayloadCreate().tipo_pessoa).toBe('PJ');
    expect(ultimoPayloadCreate().documento).toBe('11222333000181');
    expect(Object.prototype.hasOwnProperty.call(ultimoPayloadCreate(), 'cpf')).toBeFalse();
  });

  it('edição de PF legado usa documento com fallback em cpf', () => {
    component.editar({ id: 10, nome_cliente: 'Legado PF', cpf: '52998224725', tipo_pessoa: 'PF' });

    expect(component.form.get('documento')?.value).toBe('52998224725');
    expect(component.form.get('cpf')).toBeNull();
  });

  it('edição de PJ com CNPJ válido abre com formulário válido', () => {
    component.editar({ id: 11, nome_cliente: 'Empresa PJ', documento: '11222333000181', cpf: '11222333000181', tipo_pessoa: 'PJ' });

    expect(component.form.get('documento')?.valid).toBeTrue();
    expect(component.form.valid).toBeTrue();
  });

  it('CNPJ com 14 dígitos não é validado como CPF', () => {
    component.form.patchValue({ tipo_pessoa: 'PJ', documento: '11222333000181', nome_cliente: 'Empresa PJ' });

    expect(component.form.get('documento')?.errors).toBeNull();
  });

  it('mudança PF para PJ revalida documento', () => {
    component.form.patchValue({ tipo_pessoa: 'PF', documento: '11222333000181', nome_cliente: 'Empresa PJ' });
    expect(component.form.get('documento')?.hasError('documento')).toBeTrue();

    component.form.get('tipo_pessoa')?.setValue('PJ');

    expect(component.form.get('documento')?.errors).toBeNull();
  });

  it('mudança PJ para PF revalida documento', () => {
    component.form.patchValue({ tipo_pessoa: 'PJ', documento: '52998224725', nome_cliente: 'Maria Cliente' });
    expect(component.form.get('documento')?.hasError('documento')).toBeTrue();

    component.form.get('tipo_pessoa')?.setValue('PF');

    expect(component.form.get('documento')?.errors).toBeNull();
  });

  it('erro backend em documento aparece no controle documento', () => {
    api.create.and.returnValue(throwError(() => ({ error: { documento: ['CPF inválido.'] } })));
    preencherBase('PF', '52998224725');

    component.salvar();

    expect(component.form.get('documento')?.errors?.['server']).toContain('CPF inválido.');
  });

  it('erro backend em cpf legado aparece no controle documento', () => {
    api.create.and.returnValue(throwError(() => ({ error: { cpf: ['CNPJ inválido.'] } })));
    preencherBase('PJ', '11222333000181');

    component.salvar();

    expect(component.form.get('documento')?.errors?.['server']).toContain('CNPJ inválido.');
  });

  it('máscara de CPF funciona', () => {
    expect(component.formatDocumentoInput('52998224725', 'PF')).toBe('529.982.247-25');
    expect(component.formatDocumentoInput('5299822472599', 'PF')).toBe('529.982.247-25');
  });

  it('máscara de CNPJ funciona', () => {
    expect(component.formatDocumentoInput('11222333000181', 'PJ')).toBe('11.222.333/0001-81');
    expect(component.formatDocumentoInput('1122233300018199', 'PJ')).toBe('11.222.333/0001-81');
  });

  it('update da tela não envia cpf', () => {
    component.editar({ id: 22, nome_cliente: 'Empresa PJ', documento: '11222333000181', tipo_pessoa: 'PJ' });
    component.salvar();

    const payload = api.update.calls.mostRecent().args[1] as Cliente;
    expect(payload.documento).toBe('11222333000181');
    expect(Object.prototype.hasOwnProperty.call(payload, 'cpf')).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(payload, 'ativo')).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(payload, 'bloqueio')).toBeFalse();
  });

  it('ação de ciclo abre confirmação antes de chamar a API', () => {
    component.executarCiclo({ id: 31, nome_cliente: 'Cliente', documento: '52998224725' }, 'ativar');

    expect(api.patch).not.toHaveBeenCalled();
    expect(api.ativar).not.toHaveBeenCalled();
    expect(component.confirmActionModal?.action).toBe('ativar');
  });

  it('confirmação de ciclo chama ação oficial e recarrega lista', () => {
    component.executarCiclo({ id: 31, nome_cliente: 'Cliente', documento: '52998224725' }, 'ativar');

    component.confirmarAcaoCiclo();

    expect(api.ativar).toHaveBeenCalledWith(31);
    expect(api.list).toHaveBeenCalled();
  });

  it('bloqueio abre modal sem prompt nativo', () => {
    const promptSpy = spyOn(window, 'prompt');

    component.bloquear({ id: 31, nome_cliente: 'Cliente', documento: '52998224725' });

    expect(promptSpy).not.toHaveBeenCalled();
    expect(component.bloqueioModal?.id).toBe(31);
    expect(api.bloquear).not.toHaveBeenCalled();
  });

  it('bloqueio exige motivo no modal', () => {
    component.bloquear({ id: 31, nome_cliente: 'Cliente', documento: '52998224725' });

    component.confirmarBloqueio();

    expect(component.bloqueioErro).toContain('motivo');
    expect(api.bloquear).not.toHaveBeenCalled();
  });

  it('bloqueio envia motivo e observação pela ação oficial', () => {
    component.bloquear({ id: 31, nome_cliente: 'Cliente', documento: '52998224725' });
    component.bloqueioMotivo = 'Inadimplência';
    component.bloqueioObservacao = 'Parcela 2';

    component.confirmarBloqueio();

    expect(api.bloquear).toHaveBeenCalledWith(31, { motivo: 'Inadimplência', observacao: 'Parcela 2' });
  });

  it('consulta carrega histórico paginado', () => {
    component.consultar({ id: 44, nome_cliente: 'Cliente', documento: '52998224725' });

    expect(api.historico).toHaveBeenCalledWith(44, 1, 10);
    expect(component.consultando).toBeTrue();
  });

  it('barra principal habilita ações conforme cliente selecionado', () => {
    component.selectedCliente = { id: 31, nome_cliente: 'Cliente', ativo: false, bloqueio: false };

    expect(component.podeAtivarSelecionado()).toBeTrue();
    expect(component.podeInativarSelecionado()).toBeFalse();
    expect(component.podeBloquearSelecionado()).toBeTrue();
    expect(component.podeDesbloquearSelecionado()).toBeFalse();
  });

  it('cliente padrão não habilita inativar, bloquear ou excluir pela seleção', () => {
    component.selectedCliente = { id: 1, nome_cliente: 'Consumidor Final', ativo: true, bloqueio: false, cliente_padrao: true };

    expect(component.podeInativarSelecionado()).toBeFalse();
    expect(component.podeBloquearSelecionado()).toBeFalse();
  });

  it('exclusão permitida fecha modal, atualiza dados e limpa seleção', () => {
    component.clientes = [{ id: 31, nome_cliente: 'Cliente', documento: '52998224725' }];
    component.selectedCliente = component.clientes[0];
    component.excluir(component.clientes[0]);

    component.confirmarExclusao();

    expect(api.remove).toHaveBeenCalledWith(31);
    expect(component.excluirModal).toBeNull();
    expect(component.selectedCliente).toBeNull();
    expect(api.list).toHaveBeenCalled();
    expect(api.indicadores).toHaveBeenCalled();
    expect(component.successMsg).toBe('Cliente excluído.');
  });

  it('exibe detail da exclusão negada sem remover seleção', () => {
    const cliente = { id: 31, nome_cliente: 'Cliente', documento: '52998224725', ativo: true };
    api.remove.and.returnValue(throwError(() => ({ error: { detail: 'Este cliente possui vendas ou outros registros vinculados e não pode ser excluído. Utilize a inativação.' } })));
    component.selectedCliente = cliente;
    component.excluir(cliente);

    component.confirmarExclusao();

    expect(component.errorMsg).toContain('Utilize a inativação');
    expect(component.excluirModal).toBeNull();
    expect(component.selectedCliente).toBe(cliente);
    expect(component.exclusaoSaving).toBeFalse();
    expect(component.podeInativarSelecionado()).toBeTrue();
  });

  it('exibe message, non_field_errors, erro de campo e fallback na exclusão', () => {
    const cliente = { id: 31, nome_cliente: 'Cliente', documento: '52998224725' };
    const cenarios = [
      [{ error: { message: 'Mensagem direta.' } }, 'Mensagem direta.'],
      [{ error: { non_field_errors: ['Erro geral.'] } }, 'Erro geral.'],
      [{ error: { cliente: ['Erro de campo.'] } }, 'Erro de campo.'],
      [{ error: {} }, 'Não foi possível excluir o cliente. Verifique se existem vendas ou outros registros vinculados. Nesse caso, utilize a inativação.'],
    ] as const;

    cenarios.forEach(([erro, esperado]) => {
      api.remove.and.returnValue(throwError(() => erro));
      component.excluir(cliente);
      component.confirmarExclusao();
      expect(component.errorMsg).toBe(esperado);
    });
  });

  it('não duplica chamada de exclusão enquanto a requisição está em andamento', () => {
    const pending = new Subject<any>();
    const cliente = { id: 31, nome_cliente: 'Cliente', documento: '52998224725' };
    api.remove.and.returnValue(pending.asObservable());
    component.excluir(cliente);

    component.confirmarExclusao();
    component.confirmarExclusao();

    expect(api.remove).toHaveBeenCalledTimes(1);
    expect(component.exclusaoSaving).toBeTrue();
    pending.error({ error: { detail: 'Negada.' } });
    expect(component.exclusaoSaving).toBeFalse();
  });

  it('histórico recarregado pode exibir evento de exclusão negada', () => {
    api.historico.and.returnValue(of({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 1,
        created_at: '2026-08-06T10:00:00Z',
        acao: 'CLIENT_DELETE_DENIED',
        acao_descricao: 'Exclusão negada',
        usuario: 'edit',
        origem: 'API',
        resultado: 'DENIED',
        campos_alterados: [],
        motivo: 'Este cliente possui vendas ou outros registros vinculados e não pode ser excluído. Utilize a inativação.',
      }]
    }));

    component.consultar({ id: 31, nome_cliente: 'Cliente', documento: '52998224725' });
    component.selecionarAreaConsulta('historico');

    expect(component.historico[0].acao).toBe('CLIENT_DELETE_DENIED');
    expect(component.historico[0].motivo).toContain('Utilize a inativação');
  });

  it('consulta inicia em dados cadastrais com histórico separado', () => {
    component.consultar({ id: 44, nome_cliente: 'Cliente', documento: '52998224725' });

    expect(component.consultaArea).toBe('dados');
    expect(api.historico).toHaveBeenCalledWith(44, 1, 10);
    expect(api.compras).not.toHaveBeenCalled();
  });

  it('aba compras carrega endpoint sob demanda', () => {
    component.consultar({ id: 44, nome_cliente: 'Cliente', documento: '52998224725' });

    component.selecionarAreaConsulta('compras');

    expect(api.compras).toHaveBeenCalledWith(44, jasmine.objectContaining({ page: 1, page_size: 10 }));
  });

  it('compras mostra retorno paginado e não altera paginação principal nem histórico', () => {
    api.compras.and.returnValue(of({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 1,
        data_venda: '2026-08-06T10:00:00Z',
        numero_venda: '1',
        numero_documento: '1',
        loja_id: 1,
        loja_nome: 'Loja',
        vendedor_id: 2,
        vendedor_nome: 'Vendedor',
        quantidade_itens: 2,
        valor_bruto: '100.00',
        desconto: '10.00',
        valor_final: '90.00',
        valor_devolvido: '0.00',
        forma_pagamento: 'DINHEIRO',
        status: 'FINALIZADA',
        status_descricao: 'Finalizada',
        cancelada: false,
        devolvida: false,
        pode_consultar_venda: false,
      }]
    }));
    component.page = 3;
    component.consultar({ id: 44, nome_cliente: 'Cliente', documento: '52998224725' });
    component.historicoPage = 2;

    component.selecionarAreaConsulta('compras');

    expect(component.comprasTotal).toBe(1);
    expect(component.compras[0].numero_venda).toBe('1');
    expect(component.page).toBe(3);
    expect(component.historicoPage).toBe(2);
  });

  it('page size de compras reinicia página sem afetar histórico', () => {
    component.consultar({ id: 44, nome_cliente: 'Cliente', documento: '52998224725' });
    component.selecionarAreaConsulta('compras');
    component.historicoPage = 3;

    component.onComprasPageSizeChange(20);

    expect(component.comprasPageSize).toBe(20);
    expect(api.compras).toHaveBeenCalledWith(44, jasmine.objectContaining({ page: 1, page_size: 20 }));
    expect(component.historicoPage).toBe(3);
  });

  it('erro de compras é exibido separado de lista vazia', () => {
    api.compras.and.returnValue(throwError(() => ({ error: { detail: 'falha' } })));
    component.consultar({ id: 44, nome_cliente: 'Cliente', documento: '52998224725' });

    component.selecionarAreaConsulta('compras');

    expect(component.comprasError).toContain('Falha');
    expect(component.compras.length).toBe(0);
  });

  it('formatadores comerciais usam moeda e texto de cliente sem compras', () => {
    expect(component.formatMoney('12.5')).toContain('R$');
    expect(component.formatUltimaCompra(null)).toBe('Nenhuma compra');
  });
});
