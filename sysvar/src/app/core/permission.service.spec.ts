import { TestBed } from '@angular/core/testing';
import { PermissionService } from './permission.service';
import { AuthService } from './auth.service';
import { NavItem } from './models/nav-item';

describe('PermissionService auditoria', () => {
  let service: PermissionService;
  const auth = {
    getUserType: jasmine.createSpy('getUserType').and.returnValue('Regular'),
    getCurrentUser: jasmine.createSpy('getCurrentUser'),
    podeAcessarModulo: jasmine.createSpy('podeAcessarModulo'),
    empresaModuloHabilitado: jasmine.createSpy('empresaModuloHabilitado').and.returnValue(true),
  };
  const item: NavItem = { label: 'Auditoria', link: '/config/auditoria', moduloEmpresa: 'auditoria' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }],
    });
    service = TestBed.inject(PermissionService);
    auth.getCurrentUser.calls.reset();
    auth.podeAcessarModulo.calls.reset();
    auth.empresaModuloHabilitado.calls.reset();
    auth.empresaModuloHabilitado.and.returnValue(true);
  });

  it('permite VIEW no menu sem role Admin', () => {
    auth.podeAcessarModulo.and.returnValue(true);
    expect(service.canAccess(item)).toBeTrue();
  });

  it('permite EDIT no menu', () => {
    auth.podeAcessarModulo.and.returnValue(true);
    expect(service.canAccess(item)).toBeTrue();
  });

  it('bloqueia NONE no menu', () => {
    auth.podeAcessarModulo.and.returnValue(false);
    expect(service.canAccess(item)).toBeFalse();
  });

  it('mantem master visivel quando permissao efetiva vem como EDIT', () => {
    auth.podeAcessarModulo.and.returnValue(true);
    auth.getCurrentUser.and.returnValue({ is_company_master: true });
    expect(service.canAccess(item)).toBeTrue();
  });
});
