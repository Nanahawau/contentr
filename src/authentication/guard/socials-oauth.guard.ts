// import { AuthGuard } from '@nestjs/passport';
// import {
//   ExecutionContext,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';

// @Injectable()
// export class SocialsOauthGuard extends AuthGuard('google') {
//   getAuthenticateOptions(context: ExecutionContext) {
//     // Prevent redirect by setting session to false and failureRedirect to undefined
//     return { session: false, failureRedirect: undefined };
//   }

//   handleRequest(err, user, info, context: ExecutionContext) {
//     if (err || !user) {
//       throw new UnauthorizedException('Google authentication failed');
//     }
//     return user;
//   }
// }
