import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () => import('../pages/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'user-profile',
        loadComponent: () => import('../pages/user-profile/user-profile.page').then(m => m.UserProfilePage)
      },
      {
        path: 'camera',
        loadComponent: () => import('../pages/camera/camera.page').then(m => m.CameraPage)
      },
      {
        path: 'results',
        loadComponent: () => import('../pages/results/results.page').then(m => m.ResultsPage)
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full'
  }
];