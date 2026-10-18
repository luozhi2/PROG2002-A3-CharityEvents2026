import { Routes } from '@angular/router';

/**
 * Client website routes.
 *
 * Each page is lazy loaded with loadComponent so the browser only downloads the
 * code for the page the visitor actually opens. The pages render inside the
 * <router-outlet> of the shared header/footer shell in app.html.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Charity Events — Home',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage)
  },
  {
    path: 'search',
    title: 'Charity Events — Search',
    loadComponent: () => import('./pages/search/search').then((m) => m.SearchPage)
  },
  {
    // Declared before ":id" so /events/register is not read as an event whose
    // id is the word "register".
    path: 'events/register',
    title: 'Charity Events — Register',
    loadComponent: () => import('./pages/registration/registration').then((m) => m.RegistrationPage)
  },
  {
    path: 'events/:id',
    title: 'Charity Events — Event details',
    loadComponent: () => import('./pages/event-detail/event-detail').then((m) => m.EventDetailPage)
  },
  {
    path: 'about',
    title: 'Charity Events — About',
    loadComponent: () => import('./pages/about/about').then((m) => m.AboutPage)
  },
  {
    path: '**',
    title: 'Charity Events — Page not found',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundPage)
  }
];
