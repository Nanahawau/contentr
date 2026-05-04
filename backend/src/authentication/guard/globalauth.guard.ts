import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt.guard';
import { SocialsOauthGuard } from './socials-oauth.guard';

@Injectable()
export class GlobalAuthGuard implements CanActivate {
  private readonly logger = new Logger(GlobalAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtGuard: JwtAuthGuard,
    private socialGuard: SocialsOauthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) return true;

    let lastError: string = 'No valid authentication method found';

    try {
      if (await this.jwtGuard.canActivate(context)) return true;
    } catch (error) {
      if (error instanceof Error) lastError = error.message;
    }

    try {
      if (await this.socialGuard.canActivate(context)) return true;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(error.message, error.stack);
        lastError = error.message;
      }
    }

    throw new UnauthorizedException(
      lastError || 'No valid authentication method found',
    );
  }
}
