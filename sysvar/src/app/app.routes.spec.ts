import { routes } from './app.routes';

describe('rotas de auditoria', () => {
  it('nao exige role Admin para acessar auditoria', () => {
    const shell = routes.find(route => route.path === '');
    const auditRoute = shell?.children?.find(route => route.path === 'config/auditoria');
    expect(auditRoute?.data?.['moduloEmpresa']).toBe('auditoria');
    expect(auditRoute?.data?.['roles']).toBeUndefined();
  });
});
