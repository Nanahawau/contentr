import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RESPONSE_MESSAGE_METADATA } from '../decorator/response-message.decorator';

export type Response<T> = {
  status: boolean;
  statusCode: number;
  message: string;
  data: T;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((res: unknown) => this.responseHandler(res, context)),
      catchError((err: HttpException) =>
        throwError(() => this.errorHandler(err, context)),
      ),
    );
  }

  errorHandler(exception: any, context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    let status: number;
    let errors = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
    } else if (exception.name === 'ValidationError') {
      status = HttpStatus.BAD_REQUEST;
      errors = exception.errors; // Mongoose validation errors
    } else if (typeof exception.statusCode === 'number') {
      status = exception.statusCode;
    } else if (typeof exception.status === 'number') {
      status = exception.status;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    const message = exception.response? exception.response.message : exception.message;

    console.log({exception})

    response.status(status).json({
      status: false,
      statusCode: status,
      message: message || 'Internal server error',
    });
  }

  responseHandler(res: any, context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const statusCode = response.statusCode;
    const message =
      this.reflector.get<string>(
        RESPONSE_MESSAGE_METADATA,
        context.getHandler(),
      ) || 'success';

    return {
      status: true,
      message: message,
      statusCode,
      data: res,
    };
  }
}
