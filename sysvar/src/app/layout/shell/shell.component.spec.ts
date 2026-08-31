import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { ShellComponent } from './shell.component';

describe('ShellComponent menu lateral', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let currentUser: any;

  const auth = {
    me: jasmine.createSpy('me').and.callFake(() => of(currentUser)),
    setCurrentUser: jasmine.createSpy('setCurrentUser').and.callFake((user: any) => currentUser = user),
    getCurrentUser: jasmine.createSpy('getCurrentUser').and.callFake(() => currentUser),
    getUserType: jasmine.createSpy('getUserType').and.callFake(() => currentUser?.type || 'Regular'),
    getUserName: jasmine.createSpy('getUserName').and.returnValue('delegado'),
    logout: jasmine.createSpy('logout').and.returnValue(of({})),
    podeAcessarModulo: jasmine.createSpy('podeAcessarModulo').and.callFake((modulo: string | null) => {
      if (!modulo) return null;
      if (currentUser?.is_full_company_administrator) return true;
      const acesso = currentUser?.permissoes_efetivas?.[modulo];
      return acesso === 'VIEW' || acesso === 'EDIT';
    }),
    empresaModuloHabilitado: jasmine.createSpy('empresaModuloHabilitado').and.callFake((modulo: string) => {
      const modulos = currentUser?.modulos_disponiveis_empresa || [];
      const baseModulo = modulo === 'fiscal_contabil' ? 'fiscal' : modulo;
      return modulos.includes(modulo) || modulos.includes(baseModulo);
    }),
    podeProcesso: jasmine.createSpy('podeProcesso').and.returnValue(false),
  };

  beforeEach(async () => {
    currentUser = {
      id: 2,
      username: 'delegado',
      type: 'Regular',
      is_full_company_administrator: true,
      modulos_disponiveis_empresa: ['fiscal'],
      permissoes_efetivas: {},
    };
    auth.me.calls.reset();
    auth.setCurrentUser.calls.reset();
    auth.getCurrentUser.calls.reset();
    auth.getUserType.calls.reset();
    auth.podeAcessarModulo.calls.reset();
    auth.empresaModuloHabilitado.calls.reset();
    auth.podeProcesso.calls.reset();

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  function render(): ShellComponent {
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('exibe Fiscal e Contábil para administrador delegado com fiscal contratado', () => {
    const component = render();
    const fiscal = component.visibleMenu.find(item => item.label === 'Fiscal e Contábil');

    expect(fiscal).toBeTruthy();
    expect(fiscal?.children?.map(child => child.label)).toContain('NCM');
    expect(fixture.nativeElement.textContent).toContain('Fiscal e Contábil');
    expect(fixture.nativeElement.textContent).toContain('NCM');
  });

  it('oculta Fiscal e Contábil para usuário comum sem acesso fiscal', () => {
    currentUser = {
      id: 3,
      username: 'comum',
      type: 'Regular',
      is_full_company_administrator: false,
      modulos_disponiveis_empresa: ['fiscal'],
      permissoes_efetivas: { fiscal: 'NONE' },
    };

    const component = render();

    expect(component.visibleMenu.some(item => item.label === 'Fiscal e Contábil')).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('Fiscal e Contábil');
  });
});
