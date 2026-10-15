import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';

describe('rotas de auditoria', () => {
  it('nao exige role Admin para acessar auditoria', () => {
    const shell = routes.find(route => route.path === '');
    const auditRoute = shell?.children?.find(route => route.path === 'config/auditoria');
    expect(auditRoute?.data?.['moduloEmpresa']).toBe('auditoria');
    expect(auditRoute?.data?.['roles']).toBeUndefined();
  });
});

describe('rotas operacionais', () => {
  const shell = routes.find(route => route.path === '');

  it('estabelecimentos nao dependem de roles antigas', () => {
    const lojas = shell?.children?.find(route => route.path === 'lojas');
    const ajuda = shell?.children?.find(route => route.path === 'ajuda/lojas');
    expect(lojas?.data?.['moduloEmpresa']).toBe('operacional');
    expect(lojas?.data?.['roles']).toBeUndefined();
    expect(ajuda?.data?.['moduloEmpresa']).toBe('operacional');
    expect(ajuda?.data?.['roles']).toBeUndefined();
  });

  it('perfis de acesso usam permissao operacional', () => {
    const perfis = shell?.children?.find(route => route.path === 'config/perfis');
    expect(perfis?.data?.['moduloEmpresa']).toBe('operacional');
    expect(perfis?.data?.['roles']).toBeUndefined();
  });

  it('possui rota protegida para troca obrigatoria de senha', () => {
    const rota = shell?.children?.find(route => route.path === 'change-password-required');
    expect(rota?.data?.['allowPasswordChange']).toBeTrue();
  });

  it('agente local exige Admin ou Diretor', () => {
    const rota = shell?.children?.find(route => route.path === 'config/agente-local');
    expect(rota?.data?.['roles']).toEqual(['Admin', 'Diretor']);
    expect(rota?.data?.['moduloEmpresa']).toBeUndefined();
  });
});

describe('rotas de compras', () => {
  const shell = routes.find(route => route.path === '');

  it('mantem rota interna de entrada de nfe em compras', () => {
    const rota = shell?.children?.find(route => route.path === 'compras/notas-entrada');
    expect(rota).toBeTruthy();
    expect(rota?.data?.['moduloEmpresa']).toBe('compras');
    expect(rota?.data?.['moduloEmpresa']).not.toBe('fiscal');
  });
});

describe('rotas de estoque', () => {
  const shell = routes.find(route => route.path === '');

  it('mantem rota operacional para NF-e', () => {
    const rota = shell?.children?.find(route => route.path === 'estoque/nfe-detectadas');
    expect(rota).toBeTruthy();
    expect(rota?.data?.['moduloEmpresa']).toBe('estoque');
    expect(rota?.data?.['roles']).toEqual(['Diretor', 'Gerente', 'Auxiliar']);
  });

  it('possui rotas operacionais para recebimento de mercadoria', () => {
    const lista = shell?.children?.find(route => route.path === 'estoque/recebimentos-mercadoria');
    const detalhe = shell?.children?.find(route => route.path === 'estoque/recebimentos-mercadoria/:id');
    expect(lista?.data?.['moduloEmpresa']).toBe('estoque');
    expect(detalhe?.data?.['moduloEmpresa']).toBe('estoque');
    expect(lista?.data?.['roles']).toEqual(['Diretor', 'Gerente', 'Auxiliar']);
    expect(detalhe?.data?.['roles']).toEqual(['Diretor', 'Gerente', 'Auxiliar']);
  });
});

describe('rotas de requisicoes', () => {
  const shell = routes.find(route => route.path === '');

  it('usa permissao propria em qualquer papel de Requisições', () => {
    const rota = shell?.children?.find(route => route.path === 'requisicoes');
    expect(rota?.data?.['moduloEmpresa']).toBeUndefined();
    expect(rota?.data?.['moduloEmpresaAnyOf']).toEqual(['requisicoes', 'requisicoes_analise', 'requisicoes_atendimento', 'requisicoes_todas']);
  });
});


describe('rotas preservadas na reorganizacao dos menus', () => {
  const shell = routes.find(route => route.path === '');
  const cenarios = [
    { path: 'loja/recebimento', modulo: 'estoque', roles: ['Diretor', 'Gerente', 'Caixa'] },
    { path: 'distribuicao', modulo: 'distribuicao', roles: ['Diretor', 'Gerente', 'Auxiliar'] },
    { path: 'distribuicao/pedidos-venda', modulo: 'distribuicao', roles: ['Diretor', 'Gerente', 'Auxiliar'] },
    { path: 'fiscal/faturamento', modulo: 'distribuicao', roles: ['Diretor', 'Gerente'] },
  ];
  for (const cenario of cenarios) {
    it('preserva rota e acesso de ' + cenario.path, () => {
      const rota = shell?.children?.find(route => route.path === cenario.path);
      expect(rota?.component).toBeTruthy();
      expect(rota?.data?.['moduloEmpresa']).toBe(cenario.modulo);
      expect(rota?.data?.['roles']).toEqual(cenario.roles);
    });
  }


});


@Component({ standalone: true, template: '<h1>Home</h1>' })
class HomeDestinoTesteComponent {}

describe('PDVs da Central descontinuados', () => {
  const shell = routes.find(route => route.path === '');
  const caminhosAntigos = ['vendas/pdv', 'vendas/pdv-desktop', 'loja/pdv-offline'];

  for (const path of caminhosAntigos) {
    it('redireciona /' + path + ' para /home sem carregar PDV', async () => {
      const legada = shell?.children?.find(route => route.path === path);
      expect(legada).toBeTruthy();
      expect(legada?.redirectTo).toBe('/home');
      expect(legada?.pathMatch).toBe('full');
      expect(legada?.component).toBeUndefined();
      expect(legada?.loadComponent).toBeUndefined();
      expect(legada?.loadChildren).toBeUndefined();
      TestBed.configureTestingModule({
        providers: [provideRouter([
          legada!,
          { path: 'home', component: HomeDestinoTesteComponent },
        ])],
      });
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/' + path, HomeDestinoTesteComponent);
      expect(TestBed.inject(Router).url).toBe('/home');
      expect(harness.routeNativeElement?.textContent).toBe('Home');
    });
  }

  it('preserva componentes e acessos de vendas, devolucoes e recebimento', () => {
    for (const [path, modulo, roles] of [
      ['vendas/relatorios', 'vendas', ['Diretor', 'Gerente']],
      ['loja/devolucoes', 'vendas', ['Diretor', 'Gerente', 'Caixa']],
      ['loja/recebimento', 'estoque', ['Diretor', 'Gerente', 'Caixa']],
    ] as const) {
      const route = shell?.children?.find(item => item.path === path);
      expect(route?.component).toBeTruthy();
      expect(route?.redirectTo).toBeUndefined();
      expect(route?.data?.['moduloEmpresa']).toBe(modulo);
      expect(route?.data?.['roles']).toEqual([...roles]);
    }
  });
});
