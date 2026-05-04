import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type VerificationState = 'verifying' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  templateUrl: './verify-email.html',
})
export class VerifyEmail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly state = signal<VerificationState>('verifying');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.state.set('error');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.state.set('success');
        const destination = this.authService.isAuthenticated() ? '/dashboard' : '/login';
        setTimeout(() => this.router.navigate([destination]), 2500);
      },
      error: () => this.state.set('error'),
    });
  }
}
