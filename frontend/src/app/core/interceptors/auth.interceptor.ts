import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { Router } from '@angular/router';
import { throwError, BehaviorSubject, Observable } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AuthTokens } from '../models/auth.model';

let isRefreshing = false;
const refreshComplete$ = new BehaviorSubject<AuthTokens | null>(null);

function addAuthorizationHeader(request: HttpRequest<unknown>, accessToken: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } });
}

function handleTokenRefresh(
  failedRequest: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    return refreshComplete$.pipe(
      filter((tokens) => tokens !== null),
      take(1),
      switchMap((tokens) => next(addAuthorizationHeader(failedRequest, tokens!.access_token))),
    );
  }

  isRefreshing = true;
  refreshComplete$.next(null);

  return authService.refresh().pipe(
    switchMap((tokens) => {
      isRefreshing = false;
      refreshComplete$.next(tokens);
      return next(addAuthorizationHeader(failedRequest, tokens.access_token));
    }),
    catchError((error) => {
      isRefreshing = false;
      authService.clearSession();
      router.navigate(['/login']);
      return throwError(() => error);
    }),
  );
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const accessToken = authService.accessToken;
  const requestWithToken = accessToken ? addAuthorizationHeader(request, accessToken) : request;

  return next(requestWithToken).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && accessToken) {
        return handleTokenRefresh(request, next, authService, router);
      }
      return throwError(() => error);
    }),
  );
};
