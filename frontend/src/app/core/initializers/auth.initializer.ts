import { inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export function authInitializer() {
  const authService = inject(AuthService);
  return () => authService.refresh().pipe(catchError(() => of(null)));
}