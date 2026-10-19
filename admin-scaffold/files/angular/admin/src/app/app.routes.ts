/**
 * Route table for the admin website.
 *
 *   /dashboard          summary of events, registrations and tickets sold
 *   /events             full event list with status filter + search + Edit/Delete
 *   /events/new         create form (POST /api/events)
 *   /events/:id/edit    edit form (PUT) PLUS that event's registrations
 *   /categories         categories with their event_count
 *
 * Every route is lazy-loaded with loadComponent so the initial bundle stays
 * small; the empty path and any unknown URL fall back to the dashboard.
 */
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard · Charity Events Admin',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage)
  },
  {
    path: 'events',
    title: 'Events · Charity Events Admin',
    loadComponent: () => import('./pages/events/events.page').then((m) => m.EventsPage)
  },
  {
    // "new" must be declared before ":id/edit" style routes would ever clash.
    path: 'events/new',
    title: 'New Event · Charity Events Admin',
    loadComponent: () => import('./pages/event-new/event-new.page').then((m) => m.EventNewPage)
  },
  {
    path: 'events/:id/edit',
    title: 'Edit Event · Charity Events Admin',
    loadComponent: () => import('./pages/event-edit/event-edit.page').then((m) => m.EventEditPage)
  },
  {
    path: 'categories',
    title: 'Categories · Charity Events Admin',
    loadComponent: () => import('./pages/categories/categories.page').then((m) => m.CategoriesPage)
  },
  { path: '**', redirectTo: 'dashboard' }
];
