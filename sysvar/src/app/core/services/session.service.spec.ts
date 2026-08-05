import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SessionService } from './session.service';
import { environment } from '../../../environments/environment';

describe('SessionService', () => {
  let service: SessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista sessões de empresa com filtro de ativas para bater com contador', () => {
    service.listSessions({ empresa: 7, ativa: 'true' }).subscribe();

    const req = http.expectOne(`${environment.apiBaseUrl}/accounts/sessoes/?empresa=7&ativa=true`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('normaliza resposta como array direto', () => {
    let rows: any[] | undefined;
    service.listSessions({ empresa: 7, ativa: 'true' }).subscribe(result => rows = result);

    const req = http.expectOne(`${environment.apiBaseUrl}/accounts/sessoes/?empresa=7&ativa=true`);
    req.flush([{ id: 1, status: 'ATIVA', token_valido: true }]);

    expect(rows?.length).toBe(1);
    expect(rows?.[0].token_valido).toBeTrue();
  });

  it('normaliza resposta paginada com results', () => {
    let rows: any[] | undefined;
    service.listSessions({ empresa: 7, ativa: 'true' }).subscribe(result => rows = result);

    const req = http.expectOne(`${environment.apiBaseUrl}/accounts/sessoes/?empresa=7&ativa=true`);
    req.flush({ count: 1, next: null, previous: null, results: [{ id: 2, status: 'ATIVA', token_valido: true }] });

    expect(rows?.length).toBe(1);
    expect(rows?.[0].status).toBe('ATIVA');
  });

  it('preserva count da resposta paginada para o modal', () => {
    let result: any;
    service.listSessionsWithCount({ empresa: 7, ativa: 'true' }).subscribe(value => result = value);

    const req = http.expectOne(`${environment.apiBaseUrl}/accounts/sessoes/?empresa=7&ativa=true`);
    req.flush({ count: 2, next: null, previous: null, results: [{ id: 1 }, { id: 2 }] });

    expect(result.count).toBe(2);
    expect(result.results.length).toBe(2);
  });

  it('normaliza formato inesperado para lista vazia', () => {
    expect(service.normalizeListResponse({ count: 1 })).toEqual([]);
    expect(service.normalizeListResult({ count: 1 }).count).toBe(1);
  });

  it('encerra sessão individual pelo endpoint central', () => {
    service.terminateSession(42).subscribe();

    const req = http.expectOne(`${environment.apiBaseUrl}/accounts/sessoes/42/encerrar/`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 42, status: 'ENCERRADA' });
  });
});
