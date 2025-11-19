import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'tab1',
        loadComponent: () => import('../tab1/tab1.page').then(m => m.Tab1Page)
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
        redirectTo: '/tabs/tab1',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/tab1',
    pathMatch: 'full'
  }
];