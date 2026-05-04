import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly httpClient = inject(HttpClient);

  getProfile(): Observable<User> {
    return this.httpClient.get<User>(`${environment.apiUrl}/user/me`);
  }
}