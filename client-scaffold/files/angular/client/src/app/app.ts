import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Root shell of the client website.
 *
 * It renders the site header (with the persistent navigation menu), the routed
 * page inside <router-outlet>, and the footer. Keeping the chrome here means the
 * navigation is present on every page, as the assessment brief requires for the
 * admin website and expects for the client website.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  /** Controls the collapsed state of the mobile navigation menu. */
  protected readonly menuOpen = signal(false);

  /** The current year, shown in the footer copyright line. */
  protected readonly year = new Date().getFullYear();

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /** Close the mobile menu after a navigation link is followed. */
  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
