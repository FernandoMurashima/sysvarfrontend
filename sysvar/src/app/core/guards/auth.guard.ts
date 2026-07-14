// src/app/core/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';
import { AuthService } from '../auth.service';
import { UserRole } from '../models/nav-item';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigateByUrl('/login');
    return false;
  }

  if (route.data?.['superOnly']) {
    const cachedUser = auth.getCurrentUser();
    if (cachedUser) {
      if (cachedUser.is_superuser === true) return true;
      router.navigateByUrl('/home');
      return false;
    }

    return auth.me().pipe(
      tap(user => auth.setCurrentUser(user)),
      map(user => {
        if (user.is_superuser === true) return true;
        router.navigateByUrl('/home');
        return false;
      }),
      catchError(() => {
        router.navigateByUrl('/home');
        return of(false);
      })
    );
  }

  const moduloEmpresa = route.data?.['moduloEmpresa'] as 'cadastros' | 'produtos' | 'vendas' | 'compras' | 'estoque' | 'financeiro' | 'fiscal' | 'producao' | 'relatorios' | 'configuracoes' | undefined;
  const permissaoModulo = auth.podeAcessarModulo(moduloEmpresa || null);
  if (permissaoModulo === false) {
    router.navigateByUrl('/home');
    return false;
  }
  if (moduloEmpresa && !auth.empresaModuloHabilitado(moduloEmpresa)) {
    router.navigateByUrl('/home');
    return false;
  }

  const roles = (route.data?.['roles'] ?? []) as UserRole[];
  if (!roles.length) return true;

  const current = auth.getUserType() as UserRole | null;
  if (permissaoModulo === true) return true;
  if (current === 'Admin' || (current && roles.includes(current))) return true;

  router.navigateByUrl('/home');
  return false;
};
