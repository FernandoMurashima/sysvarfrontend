import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { HubSincronizacaoService } from './hub-sincronizacao.service';

describe('HubSincronizacaoService', () => {
  let service: HubSincronizacaoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HubSincronizacaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('deve buscar painel', () => {
    service.listarPainel().subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/hub/sincronizacoes/`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('deve solicitar sincronizacao de loja', () => {
    service.sincronizarLoja(7).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/hub/sincronizacoes/solicitar/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ loja_id: 7 });
    req.flush({ id: 1 });
  });

  it('deve solicitar sincronizacao de todas', () => {
    service.sincronizarTodas().subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/hub/sincronizacoes/todas/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ criadas: 0, ja_pendentes: 0, ignoradas_sem_hub: 0, ignoradas_inativas: 0, solicitacoes: [] });
  });
});
