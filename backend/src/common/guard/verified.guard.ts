import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

type AuthenticatedRequest = {
  user: { id: string; email: string; verified: boolean };
};

@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user.verified) {
      throw new ForbiddenException('Email verification required');
    }

    return true;
  }
}
