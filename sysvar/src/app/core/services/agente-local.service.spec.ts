import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AgenteLocalService } from './agente-local.service';

describe('AgenteLocalService', () => {
  let service: AgenteLocalService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AgenteLocalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gera codigo de ativacao com POST e body vazio', () => {
    service.gerarCodigoAtivacao().subscribe(res => {
      expect(res.codigo).toBe('ABCD-EFGH-IJKL');
    });

    const req = http.expectOne(request =>
      request.method === 'POST' &&
      request.url.endsWith('/fiscal/agente-local/ativacoes/')
    );
    expect(req.request.body).toEqual({});
    req.flush({ codigo: 'ABCD-EFGH-IJKL', expira_em: '2026-09-03T12:15:00Z', empresa: 1 });
  });

  it('usa endpoints existentes para agentes e configuracoes', () => {
    service.listarAgentes().subscribe();
    service.listarConfiguracoes().subscribe();

    expect(http.expectOne(req => req.method === 'GET' && req.url.endsWith('/fiscal/agentes-locais/'))).toBeTruthy();
    expect(http.expectOne(req => req.method === 'GET' && req.url.endsWith('/fiscal/configuracoes-xml-fornecedor/'))).toBeTruthy();
  });

  it('cria configuracao de pasta monitorada por POST', () => {
    const payload = { empresa: 1, loja: null, caminho_local: 'C:\\Fiscal\\XML', ativo: true, identificador_agente: 'AG-1' };
    service.criarConfiguracao(payload).subscribe();

    const req = http.expectOne(request =>
      request.method === 'POST' &&
      request.url.endsWith('/fiscal/configuracoes-xml-fornecedor/')
    );
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 1, ...payload });
  });

  it('edita configuracao de pasta monitorada por PATCH', () => {
    service.atualizarConfiguracao(7, { ativo: false }).subscribe();

    const req = http.expectOne(request =>
      request.method === 'PATCH' &&
      request.url.endsWith('/fiscal/configuracoes-xml-fornecedor/7/')
    );
    expect(req.request.body).toEqual({ ativo: false });
    req.flush({ id: 7, empresa: 1, loja: null, caminho_local: 'C:\\Fiscal\\XML', ativo: false, identificador_agente: 'AG-1' });
  });
});
