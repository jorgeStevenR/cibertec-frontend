import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const estudianteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const usuario = auth.usuarioActual();
  if (usuario?.rol === 'ESTUDIANTE') {
    return true;
  }

  return router.createUrlTree(['/login']);
};
