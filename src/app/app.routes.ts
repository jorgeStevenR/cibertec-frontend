import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { profesorGuard } from './core/guards/profesor.guard';
import { estudianteGuard } from './core/guards/estudiante.guard';

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
        path: 'programas',
        loadComponent: () =>
          import('./pages/admin/programas-page/programas-page').then((m) => m.ProgramasPage),
      },
      {
        path: 'programas/:programaId',
        loadComponent: () =>
          import('./pages/admin/programa-detalle-page/programa-detalle-page').then(
            (m) => m.ProgramaDetallePage,
          ),
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
    path: 'profesor',
    loadComponent: () =>
      import('./pages/profesor/profesor-layout/profesor-layout').then((m) => m.ProfesorLayout),
    canActivate: [profesorGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/profesor/cursos-page/cursos-page').then((m) => m.ProfesorCursosPage),
      },
      {
        path: 'cursos/:cursoId',
        loadComponent: () =>
          import('./pages/profesor/curso-detalle-page/curso-detalle-page').then(
            (m) => m.ProfesorCursoDetallePage,
          ),
      },
    ],
  },
  {
    path: 'estudiante',
    loadComponent: () =>
      import('./pages/estudiante/estudiante-layout/estudiante-layout').then((m) => m.EstudianteLayout),
    canActivate: [estudianteGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/estudiante/cursos-page/cursos-page').then((m) => m.EstudianteCursosPage),
      },
      {
        path: 'cursos/:cursoId',
        loadComponent: () =>
          import('./pages/estudiante/curso-detalle-page/curso-detalle-page').then(
            (m) => m.EstudianteCursoDetallePage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
