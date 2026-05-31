// src/app/core/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { UserRole } from '../models/nav-item';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigateByUrl('/login');
    return false;
  }

  const roles = (route.data?.['roles'] ?? []) as UserRole[];
  if (!roles.length) return true;

  const current = auth.getUserType() as UserRole | null;
  if (current === 'Admin' || (current && roles.includes(current))) return true;

  router.navigateByUrl('/home');
  return false;
};
