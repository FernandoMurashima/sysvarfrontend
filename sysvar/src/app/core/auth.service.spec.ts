import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { SessionService } from './services/session.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let sessions: SessionService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    sessions = TestBed.inject(SessionService);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('chama logout no backend antes de limpar token e para heartbeat ao concluir', () => {
    spyOn(sessions, 'stopHeartbeat').and.callThrough();
    service.setToken('token-atual');

    service.logout().subscribe();
    const req = http.expectOne(`${service.api}/auth/logout/`);

    expect(req.request.headers.get('Authorization')).toBe('Token token-atual');
    expect(service.getToken()).toBe('token-atual');

    req.flush({ detail: 'logged out' });

    expect(service.getToken()).toBeNull();
    expect(sessions.stopHeartbeat).toHaveBeenCalled();
  });

  it('limpa estado local mesmo quando o backend de logout falha', () => {
    spyOn(sessions, 'stopHeartbeat').and.callThrough();
    service.setToken('token-com-erro');

    service.logout().subscribe({ error: () => {} });
    const req = http.expectOne(`${service.api}/auth/logout/`);
    req.flush({ detail: 'erro' }, { status: 500, statusText: 'Server Error' });

    expect(service.getToken()).toBeNull();
    expect(sessions.stopHeartbeat).toHaveBeenCalled();
  });

  it('login bloqueado por limite não salva token nem sessão local', () => {
    service.login('joao', '12345678').subscribe({ error: () => {} });
    const req = http.expectOne(`${service.api}/auth/token/`);

    req.flush(
      { code: 'CONCURRENT_SESSION_LIMIT_REACHED', detail: 'Limite atingido.' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(service.getToken()).toBeNull();
    expect(sessionStorage.getItem('access_session_id')).toBeNull();
  });

  it('login bem-sucedido após logout salva novo token e session_id', () => {
    service.setToken('token-antigo');
    service.logout().subscribe();
    http.expectOne(`${service.api}/auth/logout/`).flush({ detail: 'logged out' });

    service.login('fernando', '12345678').subscribe();
    http.expectOne(`${service.api}/auth/token/`).flush({
      token: 'token-novo',
      session_id: 'sessao-nova',
      user: { id: 1, username: 'fernando', first_name: '', last_name: '', email: '', type: 'Admin' },
    });

    expect(service.getToken()).toBe('token-novo');
    expect(sessionStorage.getItem('access_session_id')).toBe('sessao-nova');
  });

  it('administrador delegado possui acesso funcional total pelo payload efetivo', () => {
    service.setCurrentUser({
      id: 2,
      username: 'delegado',
      first_name: '',
      last_name: '',
      email: '',
      type: 'Regular',
      is_full_company_administrator: true,
      is_superuser: false,
      is_company_master: false,
      modulos_disponiveis_empresa: ['fiscal'],
      permissoes_efetivas: { fiscal: 'NONE' },
      permissoes_processos: {},
    });

    expect(service.podeAcessarModulo('fiscal', true)).toBeTrue();
    expect(service.empresaModuloHabilitado('fiscal_contabil')).toBeTrue();
    expect(service.podeAcessarModulo('fiscal_contabil', true)).toBeTrue();
    expect(service.podeAcessarModulo('financeiro', true)).toBeTrue();
    expect(service.podeExcluirModulo('fiscal')).toBeTrue();
    expect(service.podeProcesso('requisicoes.aprovar')).toBeTrue();
    expect(service.permissaoCampo('produto.custo')).toBeTrue();
    expect(service.isAdministrador()).toBeTrue();
  });

  it('resolve fiscal_contabil pelo modulo fiscal contratado para usuarios comuns', () => {
    service.setCurrentUser({
      id: 3,
      username: 'fiscal',
      first_name: '',
      last_name: '',
      email: '',
      type: 'Regular',
      is_full_company_administrator: false,
      is_superuser: false,
      is_company_master: false,
      modulos_disponiveis_empresa: ['fiscal'],
      permissoes_efetivas: { fiscal: 'VIEW' },
      permissoes_processos: {},
    });

    expect(service.empresaModuloHabilitado('fiscal_contabil')).toBeTrue();
    expect(service.podeAcessarModulo('fiscal_contabil')).toBeTrue();
  });
});
