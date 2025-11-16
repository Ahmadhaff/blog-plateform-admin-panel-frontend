import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      },
      {
        path: 'overview',
        loadComponent: () => import('./pages/dashboard/overview/overview.component').then(m => m.OverviewComponent)
      },
      {
        path: 'articles',
        loadComponent: () => import('./pages/dashboard/articles/articles.component').then(m => m.ArticlesComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/dashboard/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'editors',
        loadComponent: () => import('./pages/dashboard/editors/editors.component').then(m => m.EditorsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
