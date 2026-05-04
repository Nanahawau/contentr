import { ConfigType } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { Inject, Injectable } from '@nestjs/common';
import googleOAuthConfig from '../../config/google-oauth.config';

@Injectable()
export class GoogleOauthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(googleOAuthConfig.KEY) private googleConfig: ConfigType<typeof googleOAuthConfig>,
    private readonly userService: UserService,
  ) {
    super({
      clientID: googleConfig.clientID,
      clientSecret: googleConfig.clientSecret,
      callbackURL: googleConfig.callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails[0].value;
    const existingUser = await this.userService.findOne(email, 'google');

    if (existingUser) return this.userService.userObject(existingUser);

    return this.userService.create({
      provider: 'google',
      first_name: profile.name.givenName,
      email,
    });
  }
}
