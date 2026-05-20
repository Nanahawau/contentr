import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((module) => module.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((module) => module.Register),
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/verify-email/verify-email').then((module) => module.VerifyEmail),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((module) => module.Dashboard),
  },
  {
    path: 'uploads',
    canActivate: [authGuard],
    loadComponent: () => import('./features/uploads/upload-list/upload-list').then((module) => module.UploadList),
  },
  {
    path: 'uploads/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/uploads/upload-new/upload-new').then((module) => module.UploadNew),
  },
  {
    path: 'uploads/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/uploads/upload-detail/upload-detail').then((module) => module.UploadDetail),
  },
  {
    path: 'credits/history',
    canActivate: [authGuard],
    loadComponent: () => import('./features/credits/credit-history/credit-history').then((module) => module.CreditHistory),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];