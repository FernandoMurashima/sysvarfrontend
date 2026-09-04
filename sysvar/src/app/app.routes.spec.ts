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

  it('entrada de nfe pertence ao modulo compras sem requisito fiscal paralelo', () => {
    const rota = shell?.children?.find(route => route.path === 'compras/notas-entrada');
    expect(rota?.data?.['moduloEmpresa']).toBe('compras');
    expect(rota?.data?.['moduloEmpresa']).not.toBe('fiscal');
  });
});

describe('rotas de estoque', () => {
  const shell = routes.find(route => route.path === '');

  it('possui rota operacional para NF-e detectadas', () => {
    const rota = shell?.children?.find(route => route.path === 'estoque/nfe-detectadas');
    expect(rota?.data?.['moduloEmpresa']).toBe('estoque');
    expect(rota?.data?.['roles']).toEqual(['Diretor', 'Gerente', 'Auxiliar']);
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
