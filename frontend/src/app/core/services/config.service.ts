import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

type PublicConfig = {
  maxUploadSizeMb: number;
};

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly _maxUploadSizeMb = signal(100);

  readonly maxUploadSizeMb = this._maxUploadSizeMb.asReadonly();

  load() {
    return this.http
      .get<PublicConfig>('/api/config')
      .pipe(tap((config) => this._maxUploadSizeMb.set(config.maxUploadSizeMb)));
  }
}