import { inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ConfigService } from '../services/config.service';

export function configInitializer() {
  const configService = inject(ConfigService);
  return () => configService.load().pipe(catchError(() => of(null)));
}
