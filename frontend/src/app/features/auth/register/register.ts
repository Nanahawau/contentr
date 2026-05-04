import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly registerForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/(?=.*[A-Z])/),
        Validators.pattern(/(?=.*[a-z])/),
        Validators.pattern(/(?=.*\d)/),
        Validators.pattern(/(?=.*[@$!%*?&])/),
      ],
    ],
  });

  protected submitRegister(): void {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.registerForm.getRawValue() as { email: string; password: string }).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { registered: true } }),
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Registration failed. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  protected registerWithGoogle(): void {
    window.location.href = `${window.location.origin}/api/auth/google`;
  }
}