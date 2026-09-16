import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const gestorUsuariosGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const usuario = auth.usuarioActual();
  if (usuario?.rol === 'GESTOR_USUARIOS') {
    return true;
  }

  return router.createUrlTree(['/login']);
};
