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
    // Public routes
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) return true;

    let message = null;

    // Try JWT first
    try {
      if (await this.jwtGuard.canActivate(context)) return true;
    } catch (error) {
      message = error?.message;
    }
    // Then try Google
    try {
      const result = await this.socialGuard.canActivate(context);
      if (result) return true;
    } catch (error) {
      console.log({ error });
      message = error?.message;
      this.logger.error(error.message, error.stack);
    }

    throw new UnauthorizedException(
      message || 'No valid authentication method found',
    );
  }
}
