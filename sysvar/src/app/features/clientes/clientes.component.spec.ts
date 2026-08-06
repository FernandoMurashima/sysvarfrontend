import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

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
      'list', 'indicadores', 'get', 'create', 'update', 'patch', 'historico',
      'ativar', 'inativar', 'bloquear', 'desbloquear', 'remove'
    ]);
    api.list.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    api.indicadores.and.returnValue(of(indicadores));
    api.get.and.returnValue(of({ id: 1, nome_cliente: 'Cliente' }));
    api.historico.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    api.create.and.returnValue(of({ id: 1, nome_cliente: 'Cliente' }));
    api.update.and.returnValue(of({ id: 1, nome_cliente: 'Cliente' }));
    api.patch.and.returnValue(of({ id: 1, nome_cliente: 'Cliente' }));
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
});
