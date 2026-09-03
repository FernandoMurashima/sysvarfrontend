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
});
