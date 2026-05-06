import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Sidebar } from '../../shared/components/sidebar/sidebar';
import { TopBar } from '../../shared/components/top-bar/top-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterOutlet, RouterLink, Sidebar, TopBar],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly authService = inject(AuthService);

  resendVerification(): void {
    this.authService.resendVerification().subscribe();
  }
}