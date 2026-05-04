import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class Sidebar {
  protected readonly authService = inject(AuthService);
  protected readonly isCollapsed = signal(false);
  protected readonly showUserMenu = signal(false);

  toggleSidebar(): void {
    this.isCollapsed.update((collapsed) => !collapsed);
  }

  toggleUserMenu(): void {
    this.showUserMenu.update((open) => !open);
  }

  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  logout(): void {
    this.showUserMenu.set(false);
    this.authService.logout();
  }
}