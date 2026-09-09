import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin-entry-page/admin-entry-page').then((m) => m.AdminEntryPage),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: 'login' },
];
