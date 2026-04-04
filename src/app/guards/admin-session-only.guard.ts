import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminSessionOnlyGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAdmin = auth.isAdmin();
  const allowAdminSession = route.data?.['allowAdminSession'] === true;

  if (isAdmin && !allowAdminSession) {
    return router.createUrlTree(['/admin']);
  }

  return true;
};