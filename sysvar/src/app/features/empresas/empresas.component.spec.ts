import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { EmpresasComponent } from './empresas.component';
import { EmpresasService } from '../../core/services/empresas.service';
import { SessionService } from '../../core/services/session.service';
import { AccessControlService } from '../../core/services/access-control.service';
import { AuthService } from '../../core/auth.service';

describe('EmpresasComponent sessões da empresa', () => {
  let fixture: ComponentFixture<EmpresasComponent>;
  let component: EmpresasComponent;
  let empresasApi: jasmine.SpyObj<EmpresasService>;
  let sessionsApi: jasmine.SpyObj<SessionService>;

  const empresa = { id: 7, nome: 'New Modas' };
  const contrato = {
    empresa: 7,
    status: 'ATIVO' as const,
    data_inicio: '2026-01-01',
    limite_usuarios: 5,
    limite_sessoes_simultaneas: 2,
    plano_completo: true,
    sessoes_ativas: 1,
    sessoes_disponiveis: 1,
    modulos_contratados: [],
  };
  const sessao = {
    id: 12,
    usuario_username: 'joao',
    usuario_nome: 'João',
    usuario_perfil: 'Operador',
    loja_nome: 'Loja 1',
    dispositivo_id: 'chrome-device',
    navegador: 'Chrome',
    sistema_operacional: 'Windows',
    ip: '127.0.0.1',
    iniciada_em: '2026-08-05T10:00:00Z',
    ultima_atividade_em: '2026-08-05T10:02:00Z',
    tempo_conectado_segundos: 120,
    status: 'ATIVA',
    token_valido: true,
    token_revogado: false,
  };

  beforeEach(async () => {
    empresasApi = jasmine.createSpyObj<EmpresasService>('EmpresasService', ['list', 'getContrato', 'updateContrato', 'create', 'update', 'patch', 'remove', 'suspender', 'reativar']);
    sessionsApi = jasmine.createSpyObj<SessionService>('SessionService', ['listSessions', 'listSessionsWithCount', 'terminateSession']);
    empresasApi.list.and.returnValue(of([]));
    empresasApi.getContrato.and.returnValue(of(contrato));
    sessionsApi.listSessions.and.returnValue(of([sessao]));
    sessionsApi.listSessionsWithCount.and.returnValue(of({ count: 1, results: [sessao] }));
    sessionsApi.terminateSession.and.returnValue(of({ id: sessao.id, status: 'ENCERRADA' }));

    await TestBed.configureTestingModule({
      imports: [EmpresasComponent],
      providers: [
        { provide: EmpresasService, useValue: empresasApi },
        { provide: SessionService, useValue: sessionsApi },
        { provide: AccessControlService, useValue: { modulos: () => of([]) } },
        { provide: AuthService, useValue: { getCurrentUser: () => ({ is_superuser: true }) } },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmpresasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('contador 1 e uma linha não mostra divergência', () => {
    component.empresaSessaoCountEsperado = 1;
    component.sessoesEmpresa = [sessao];

    expect(component.sessoesEmpresaDivergente()).toBeFalse();
  });

  it('contador 1 e zero linhas mostra divergência', () => {
    component.empresaSessaoCountEsperado = 1;
    component.sessoesEmpresa = [];

    expect(component.sessoesEmpresaDivergente()).toBeTrue();
  });

  it('uma linha não mostra estado vazio', () => {
    component.sessoesEmpresa = [sessao];

    expect(component.sessoesEmpresaVazia()).toBeFalse();
  });

  it('zero linhas mostra estado vazio', () => {
    component.sessoesEmpresa = [];

    expect(component.sessoesEmpresaVazia()).toBeTrue();
  });

  it('sessão válida aparece com token_valido=true e status=ATIVA', () => {
    component.abrirSessoesEmpresa(empresa);

    expect(sessionsApi.listSessionsWithCount).toHaveBeenCalledWith({ empresa: 7, ativa: 'true' });
    expect(component.sessoesEmpresa.length).toBe(1);
    expect(component.sessoesEmpresa[0].token_valido).toBeTrue();
    expect(component.sessoesEmpresa[0].status).toBe('ATIVA');
  });

  it('usa count do endpoint de sessões na mensagem do modal', () => {
    sessionsApi.listSessionsWithCount.and.returnValue(of({ count: 2, results: [sessao, { ...sessao, id: 13 }] }));
    empresasApi.getContrato.and.returnValue(of({ ...contrato, sessoes_ativas: 1 }));

    component.abrirSessoesEmpresa(empresa);

    expect(component.sessoesEmpresaLinhas()).toBe(2);
    expect(component.sessoesEmpresaEsperadas()).toBe(2);
    expect(component.sessoesEmpresaDivergente()).toBeFalse();
  });

  it('encerramento atualiza modal e indicadores', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.abrirSessoesEmpresa(empresa);
    sessionsApi.listSessionsWithCount.calls.reset();
    empresasApi.getContrato.calls.reset();

    component.encerrarSessaoEmpresa(sessao);

    expect(sessionsApi.terminateSession).toHaveBeenCalledWith(12);
    expect(sessionsApi.listSessionsWithCount).toHaveBeenCalledWith({ empresa: 7, ativa: 'true' });
    expect(empresasApi.getContrato).toHaveBeenCalledWith(7);
  });

  it('erro da API mostra mensagem adequada', () => {
    component.sessoesEmpresaModal = empresa;
    sessionsApi.listSessionsWithCount.and.returnValue(throwError(() => ({ status: 500 })));

    component.carregarSessoesEmpresa();

    expect(component.errorMsg).toBe('Falha ao carregar sessões da empresa.');
  });

  it('botão Atualizar recarrega os dados', () => {
    component.sessoesEmpresaModal = empresa;

    component.carregarSessoesEmpresa();

    expect(sessionsApi.listSessionsWithCount).toHaveBeenCalledWith({ empresa: 7, ativa: 'true' });
  });
});
