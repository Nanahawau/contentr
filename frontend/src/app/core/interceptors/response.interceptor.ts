import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

interface ApiResponse<T> {
  status: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export const responseInterceptor: HttpInterceptorFn = (request, next) => {
  return next(request).pipe(
    map((event) => {
      if (event instanceof HttpResponse && event.body && typeof event.body === 'object' && 'data' in event.body) {
        return event.clone({ body: (event.body as ApiResponse<unknown>).data });
      }
      return event;
    }),
  );
};