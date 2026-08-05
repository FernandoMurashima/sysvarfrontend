import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../auth.service';

describe('authGuard troca obrigatoria', () => {
  const router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
  const auth = {
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
    getCurrentUser: jasmine.createSpy('getCurrentUser'),
    podeAcessarModulo: jasmine.createSpy('podeAcessarModulo').and.returnValue(true),
    empresaModuloHabilitado: jasmine.createSpy('empresaModuloHabilitado').and.returnValue(true),
    getUserType: jasmine.createSpy('getUserType').and.returnValue('Regular'),
    me: jasmine.createSpy('me'),
    setCurrentUser: jasmine.createSpy('setCurrentUser'),
  };

  beforeEach(() => {
    router.navigateByUrl.calls.reset();
    auth.getCurrentUser.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  it('redireciona para troca quando a flag esta pendente', () => {
    auth.getCurrentUser.and.returnValue({ deve_trocar_senha: true });
    const result = TestBed.runInInjectionContext(() => authGuard({ data: {}, routeConfig: { path: 'home' } } as any, {} as any));
    expect(result).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/change-password-required');
  });

  it('permite a rota de troca quando a flag esta pendente', () => {
    auth.getCurrentUser.and.returnValue({ deve_trocar_senha: true });
    const result = TestBed.runInInjectionContext(() => authGuard({ data: { allowPasswordChange: true }, routeConfig: { path: 'change-password-required' } } as any, {} as any));
    expect(result).toBeTrue();
  });
});
