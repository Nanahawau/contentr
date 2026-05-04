import { AuthGuard } from '@nestjs/passport';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class SocialsOauthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    return { session: false, failureRedirect: undefined };
  }
  handleRequest<TUser = Express.User>(error: Error, user: TUser): TUser {
    if (error || !user)
      throw new UnauthorizedException('Google authentication failed');
    return user;
  }
}
