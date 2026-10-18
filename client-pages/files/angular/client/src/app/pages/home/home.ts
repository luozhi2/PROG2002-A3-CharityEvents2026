import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Category, CharityEvent } from '../../models/api.models';
import { ApiError, EventService } from '../../services/event.service';
import { EventCardComponent } from '../../shared/event-card/event-card';

/**
 * Home page.
 *
 * Acts as the entry point of the client website: a hero with a quick search box,
 * the charity event categories, and the next few upcoming Active events. All of
 * this data comes from the API through EventService - nothing is hard-coded.
 */
@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterLink, EventCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomePage implements OnInit {
  private readonly events = inject(EventService);
  private readonly router = inject(Router);

  // --- page state, held in signals so the template updates automatically ----
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly upcoming = signal<CharityEvent[]>([]);

  /** Bound to the hero search box. */
  protected searchTerm = '';

  /** Total tickets already sold across the listed events, for the hero stats. */
  protected readonly ticketsSold = computed(() =>
    this.upcoming().reduce((total, event) => total + event.tickets_sold, 0)
  );

  ngOnInit(): void {
    this.loadCategories();
    this.loadUpcomingEvents();
  }

  /** Load the categories shown as tiles below the hero. */
  private loadCategories(): void {
    this.events.getCategories().subscribe({
      next: (response) => this.categories.set(response.categories),
      // A failure here is not fatal: the page still works without the tiles.
      error: () => this.categories.set([])
    });
  }

  /** Load the next six upcoming Active events from the API. */
  protected loadUpcomingEvents(): void {
    this.loading.set(true);
    this.error.set(null);

    this.events.getEvents({ status: 'Active', sort: 'date_asc' }).subscribe({
      next: (response) => {
        this.upcoming.set(response.events.slice(0, 6));
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.loading.set(false);
      }
    });
  }

  /** Send the hero search box to the search page as a query string. */
  protected submitSearch(): void {
    const term = this.searchTerm.trim();
    this.router.navigate(['/search'], term ? { queryParams: { search: term } } : {});
  }

  /** Open the search page pre-filtered to one category. */
  protected browseCategory(category: Category): void {
    this.router.navigate(['/search'], { queryParams: { category_id: category.category_id } });
  }

  /** A pictogram for a category tile. Falls back to a generic heart. */
  protected categoryIcon(name: string): string {
    const icons: Record<string, string> = {
      Health: '🏥',
      Environment: '🌿',
      Education: '🎓',
      Community: '🤝',
      'Animal Welfare': '🐾'
    };
    return icons[name] ?? '❤️';
  }
}
