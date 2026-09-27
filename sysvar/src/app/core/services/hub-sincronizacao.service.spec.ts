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
    const req = http.expectOne(`${environment.apiBaseUrl}/hub/administracao/`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('deve listar ativacoes', () => {
    service.listarAtivacoes().subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/hub/ativacoes/`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('deve gerar ativacao', () => {
    service.gerarAtivacao(7).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/hub/ativacoes/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ loja_id: 7 });
    req.flush({ id: 1, codigo: 'ABCD-EFGH-IJKL' });
  });

  it('deve revogar ativacao', () => {
    service.revogarAtivacao(9).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/hub/ativacoes/9/revogar/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ id: 9 });
  });

  it('deve executar acoes administrativas do hub', () => {
    service.desativarHub(3).subscribe();
    service.reativarHub(4).subscribe();
    service.desvincularHub(5).subscribe();

    const desativar = http.expectOne(`${environment.apiBaseUrl}/hub/administracao/3/desativar/`);
    expect(desativar.request.method).toBe('POST');
    desativar.flush({});
    const reativar = http.expectOne(`${environment.apiBaseUrl}/hub/administracao/4/reativar/`);
    expect(reativar.request.method).toBe('POST');
    reativar.flush({});
    const desvincular = http.expectOne(`${environment.apiBaseUrl}/hub/administracao/5/desvincular/`);
    expect(desvincular.request.method).toBe('POST');
    desvincular.flush({});
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
