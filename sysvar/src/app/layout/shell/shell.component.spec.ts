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

  function findItem(items: any[] | undefined, label: string): any | undefined {
    for (const item of items || []) {
      if (item.label === label) return item;
      const child = findItem(item.children, label);
      if (child) return child;
    }
    return undefined;
  }

  function linksOf(items: any[] | undefined): string[] {
    return (items || []).flatMap(item => [
      ...(item.link ? [item.link] : []),
      ...linksOf(item.children),
    ]);
  }

  it('exibe Fiscal / Contábil para administrador delegado com fiscal contratado', () => {
    const component = render();
    const fiscal = component.visibleMenu.find(item => item.label === 'Fiscal / Contábil');

    expect(fiscal).toBeTruthy();
    expect(findItem(fiscal?.children, 'NCM')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Fiscal / Contábil');
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

    expect(component.visibleMenu.some(item => item.label === 'Fiscal / Contábil')).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('Fiscal / Contábil');
  });

  it('mostra Agente para Admin ou Diretor em Cadastros > Operacional', () => {
    currentUser = {
      id: 4,
      username: 'admin',
      type: 'Admin',
      is_full_company_administrator: false,
      modulos_disponiveis_empresa: ['operacional'],
      permissoes_efetivas: { operacional: 'EDIT' },
    };

    let component = render();
    let cadastros = component.visibleMenu.find(item => item.label === 'Cadastros');
    let operacional = findItem(cadastros?.children, 'Operacional');
    expect(operacional?.children?.some((child: any) => child.label === 'Agente' && child.link === '/config/agente-local')).toBeTrue();

    currentUser = {
      id: 5,
      username: 'diretor',
      type: 'Diretor',
      is_full_company_administrator: false,
      modulos_disponiveis_empresa: ['operacional'],
      permissoes_efetivas: { operacional: 'VIEW' },
    };
    component = render();
    cadastros = component.visibleMenu.find(item => item.label === 'Cadastros');
    operacional = findItem(cadastros?.children, 'Operacional');
    expect(operacional?.children?.some((child: any) => child.label === 'Agente')).toBeTrue();
  });

  it('oculta Agente para Gerente', () => {
    currentUser = {
      id: 6,
      username: 'gerente',
      type: 'Gerente',
      is_full_company_administrator: false,
      modulos_disponiveis_empresa: ['operacional'],
      permissoes_efetivas: { operacional: 'EDIT' },
    };

    const component = render();
    const cadastros = component.visibleMenu.find(item => item.label === 'Cadastros');
    const operacional = findItem(cadastros?.children, 'Operacional');

    expect(operacional?.children?.some((child: any) => child.label === 'Agente')).toBeFalse();
  });

  it('mostra NF-e no menu Estoque para operação de estoque', () => {
    currentUser = {
      id: 7,
      username: 'estoque',
      type: 'Gerente',
      is_full_company_administrator: false,
      modulos_disponiveis_empresa: ['estoque'],
      permissoes_efetivas: { estoque: 'VIEW' },
    };

    const component = render();
    const estoque = component.visibleMenu.find(item => item.label === 'Estoque');

    expect(findItem(estoque?.children, 'NF-e')?.link).toBe('/estoque/nfe-detectadas');
    expect(findItem(estoque?.children, 'Recebimento de Almoxarifado')?.link).toBe('/estoque/recebimentos-mercadoria');
  });

  it('nao mostra Entrada de NF-e no menu Compras', () => {
    currentUser = {
      id: 8,
      username: 'compras',
      type: 'Gerente',
      is_full_company_administrator: false,
      modulos_disponiveis_empresa: ['compras'],
      permissoes_efetivas: { compras: 'VIEW' },
    };

    const component = render();
    const compras = component.visibleMenu.find(item => item.label === 'Compras');

    expect(compras).toBeTruthy();
    expect(findItem(compras?.children, 'Pedidos de Compra')).toBeTruthy();
    expect(findItem(compras?.children, 'Cotações')).toBeTruthy();
    expect(findItem(compras?.children, 'Entrada de NF-e')).toBeFalsy();
    expect(linksOf(compras?.children)).not.toContain('/compras/notas-entrada');
  });

  it('mantem PDV somente no menu Loja e remove os PDVs do menu Vendas', () => {
    currentUser = {
      id: 9,
      username: 'caixa',
      type: 'Caixa',
      is_full_company_administrator: false,
      modulos_disponiveis_empresa: ['vendas', 'estoque'],
      permissoes_efetivas: { vendas: 'VIEW', estoque: 'VIEW' },
    };

    const component = render();
    const vendas = component.visibleMenu.find(item => item.label === 'Vendas');
    const loja = component.visibleMenu.find(item => item.label === 'Loja');

    expect(linksOf(vendas?.children)).not.toContain('/vendas/pdv');
    expect(linksOf(vendas?.children)).not.toContain('/loja/pdv-offline');
    expect(findItem(loja?.children, 'PDV')?.link).toBe('/loja/pdv-offline');
    expect(findItem(loja?.children, 'Recebimento de Mercadoria')?.link).toBe('/loja/recebimento');
    expect(findItem(loja?.children, 'Consulta de Estoque')?.link).toBe('/estoque/consulta-referencia');
  });

  it('mantem todas as rotas do menu como rotas conhecidas da barra da pagina', () => {
    const component = render();
    const links = linksOf(component.menuItems);
    let currentUrl = '/home';
    spyOnProperty((component as any).router, 'url', 'get').and.callFake(() => currentUrl);

    expect(links).not.toContain('/vendas/pdv');
    expect(links.every(link => {
      currentUrl = link;
      return component.showPageBarControls || link === '/home';
    })).toBeTrue();
  });
});
