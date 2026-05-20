import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreditTransaction } from '../models/credit.model';

@Injectable({ providedIn: 'root' })
export class CreditService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/credits`;

  findHistory(): Observable<CreditTransaction[]> {
    return this.httpClient.get<CreditTransaction[]>(`${this.baseUrl}/history`);
  }
}
