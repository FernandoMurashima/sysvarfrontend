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

  it('encerra sessão individual pelo endpoint central', () => {
    service.terminateSession(42).subscribe();

    const req = http.expectOne(`${environment.apiBaseUrl}/accounts/sessoes/42/encerrar/`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 42, status: 'ENCERRADA' });
  });
});
