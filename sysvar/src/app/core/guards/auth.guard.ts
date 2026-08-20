// src/app/core/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';
import { AuthService } from '../auth.service';
import { ModuloEmpresa } from '../auth.service';
import { UserRole } from '../models/nav-item';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigateByUrl('/login');
    return false;
  }

  const isPasswordRoute = route.routeConfig?.path === 'change-password-required' || route.data?.['allowPasswordChange'] === true;
  const cached = auth.getCurrentUser();
  if (cached?.deve_trocar_senha === true && !isPasswordRoute) {
    router.navigateByUrl('/change-password-required');
    return false;
  }
  if (cached?.deve_trocar_senha !== true && isPasswordRoute) {
    router.navigateByUrl('/home');
    return false;
  }

  if (route.data?.['superOnly']) {
    const cachedUser = cached;
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

  const moduloEmpresa = route.data?.['moduloEmpresa'] as ModuloEmpresa | undefined;
  const moduloEmpresaAnyOf = (route.data?.['moduloEmpresaAnyOf'] ?? []) as ModuloEmpresa[];
  if (moduloEmpresaAnyOf.length) {
    const hasAny = moduloEmpresaAnyOf.some(modulo => auth.podeAcessarModulo(modulo) === true && auth.empresaModuloHabilitado(modulo));
    if (!hasAny) {
      router.navigateByUrl('/home');
      return false;
    }
  }
  const permissaoModulo = auth.podeAcessarModulo(moduloEmpresa || null);
  if (moduloEmpresa && (permissaoModulo === false || permissaoModulo === null)) {
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
  if (current && roles.includes(current)) return true;

  router.navigateByUrl('/home');
  return false;
};
