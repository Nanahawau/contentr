import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokens, LoginRequest, RegisterRequest } from '../models/auth.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly accessTokenSignal = signal<string | null>(null);
  readonly currentUser = signal<User | null>(null);

  get accessToken(): string | null {
    return this.accessTokenSignal();
  }

  isAuthenticated(): boolean {
    return this.accessTokenSignal() !== null;
  }

  login(loginRequest: LoginRequest): Observable<AuthTokens> {
    return this.httpClient
      .post<AuthTokens>(`${environment.apiUrl}/auth/login`, loginRequest)
      .pipe(tap((tokens) => this.storeSession(tokens)));
  }

  register(registerRequest: RegisterRequest): Observable<User> {
    return this.httpClient.post<User>(`${environment.apiUrl}/auth/register`, registerRequest);
  }

  refresh(): Observable<AuthTokens> {
    return this.httpClient
      .post<AuthTokens>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap((tokens) => this.storeSession(tokens)));
  }

  verifyEmail(token: string): Observable<void> {
    return this.httpClient.post<void>(`${environment.apiUrl}/auth/verify-email`, { token });
  }

  resendVerification(): Observable<void> {
    return this.httpClient.post<void>(`${environment.apiUrl}/auth/resend-verification`, {});
  }

  logout(): void {
    this.httpClient
      .post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({ complete: () => this.clearSession() });
  }

  fetchMe(): Observable<User> {
    return this.httpClient
      .get<User>(`${environment.apiUrl}/users/me`)
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  clearSession(): void {
    this.accessTokenSignal.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private storeSession(tokens: AuthTokens): void {
    this.accessTokenSignal.set(tokens.access_token);
    this.currentUser.set(tokens.user);
  }
}
