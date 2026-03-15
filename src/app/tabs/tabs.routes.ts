import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('../pages/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('../pages/products/products.page').then(
            (m) => m.ProductsPage
          ),
      },
      {
        path: 'routine',
        loadComponent: () =>
          import('../pages/routine/routine.page').then((m) => m.RoutinePage),
      },
      {
        path: 'discover',
        loadComponent: () =>
          import('../pages/discover/discover.page').then(
            (m) => m.DiscoverPage
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../pages/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
];
