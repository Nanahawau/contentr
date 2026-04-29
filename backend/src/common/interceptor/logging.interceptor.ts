import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const ms = Date.now() - now;
        this.logger.log(`${method} ${url} SUCCESS +${ms}ms`);
      }),
      catchError((err) => {
        const ms = Date.now() - now;
        this.logger.error(
          `${method} ${url} FAILED +${ms}ms - ${err.message}`,
          err.stack,
        );
        return throwError(() => err);
      }),
    );
  }
}
