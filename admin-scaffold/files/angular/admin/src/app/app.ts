/**
 * Root component of the Charity Events admin website.
 *
 * Its only jobs are:
 *   1. provide the PERSISTENT NAVIGATION that the brief requires on every page
 *      (Dashboard, Events, New Event, Categories) around the <router-outlet />,
 *   2. poll GET /api/health so the sidebar footer can show whether the API and
 *      its database are reachable - the marker sees the front end is really
 *      talking to the Express API rather than showing hard-coded data.
 *
 * The individual screens live in src/app/pages and are loaded by app.routes.ts.
 */

import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HealthService } from './services/health.service';

/** One entry of the persistent navigation menu. */
interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly healthService = inject(HealthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly year = new Date().getFullYear();

  /** The navigation rendered in the sidebar on every screen. */
  protected readonly navItems: readonly NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '▦' },
    { label: 'Events', path: '/events', icon: '☰' },
    { label: 'New Event', path: '/events/new', icon: '＋' },
    { label: 'Categories', path: '/categories', icon: '◇' }
  ];

  /**
   * Health state. `'checking'` until the first response arrives, then the API's
   * `db` value: "connected" (MySQL) or "demo" (in-memory fallback dataset).
   */
  protected readonly health = signal<'checking' | 'connected' | 'demo' | 'offline'>('checking');

  constructor() {
    // Poll every 30 seconds so the badge recovers on its own after the API is
    // restarted; takeUntilDestroyed stops the interval when the app is torn down.
    const timer = setInterval(() => this.refreshHealth(), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  ngOnInit(): void {
    this.refreshHealth();
  }

  /** Ask the API how it is doing; any failure simply marks it offline. */
  protected refreshHealth(): void {
    this.healthService
      .check()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.health.set(response.database === 'connected' ? 'connected' : 'demo');
        },
        error: () => this.health.set('offline')
      });
  }
}
