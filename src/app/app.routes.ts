import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/admin/usuarios-page/usuarios-page').then((m) => m.UsuariosPage),
      },
      {
        path: 'cursos',
        loadComponent: () => import('./pages/admin/cursos-page/cursos-page').then((m) => m.CursosPage),
      },
      {
        path: 'cursos/:cursoId',
        loadComponent: () =>
          import('./pages/admin/curso-detalle-page/curso-detalle-page').then((m) => m.CursoDetallePage),
      },
      {
        path: 'cursos/:cursoId/modulos/:moduloId',
        loadComponent: () =>
          import('./pages/admin/modulo-detalle-page/modulo-detalle-page').then(
            (m) => m.ModuloDetallePage,
          ),
      },
    ],
  },
  {
    path: 'proximamente',
    loadComponent: () =>
      import('./pages/coming-soon-page/coming-soon-page').then((m) => m.ComingSoonPage),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'login' },
];
