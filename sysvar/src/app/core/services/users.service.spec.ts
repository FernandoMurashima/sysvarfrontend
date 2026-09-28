import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { UsersService } from './users.service';
import { environment } from '../../../environments/environment';

describe('UsersService', () => {
  let service: UsersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UsersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('consulta estado da credencial PDV sem senha', () => {
    service.credencialPdv(12).subscribe(status => {
      expect(status.configurada).toBeTrue();
      expect((status as any).senha_hash).toBeUndefined();
    });

    const req = http.expectOne(`${environment.apiBaseUrl}/accounts/users/12/credencial-pdv/`);
    expect(req.request.method).toBe('GET');
    req.flush({ configurada: true, habilitada: true, atualizado_em: '2026-09-28T10:00:00-03:00' });
  });

  it('salva e remove credencial PDV pela API oficial', () => {
    service.salvarCredencialPdv(12, { senha: 'SenhaPdv123', confirmacao: 'SenhaPdv123' }).subscribe();
    const put = http.expectOne(`${environment.apiBaseUrl}/accounts/users/12/credencial-pdv/`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ senha: 'SenhaPdv123', confirmacao: 'SenhaPdv123' });
    put.flush({ configurada: true, habilitada: true });

    service.removerCredencialPdv(12).subscribe();
    const del = http.expectOne(`${environment.apiBaseUrl}/accounts/users/12/credencial-pdv/`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
  });
});
