import { ConfigType } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { Inject, Injectable } from '@nestjs/common';
import googleOAuth from '../../config/google-oauth.config';

@Injectable()
export class GoogleOauthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(googleOAuth.KEY)
    private configService: ConfigType<typeof googleOAuth>,
    private readonly userService: UserService,
  ) {
    super({
      clientID: configService.clientID,
      clientSecret: configService.clientSecret,
      callbackURL: configService.callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const { id, name, emails } = profile;

    let user = await this.userService.findOne({
      email: emails[0].value as string,
      provider: 'google',
    });

    if (!user) {
      return this.userService.create({
        provider: 'google',
        first_name: name.givenName,
        email: emails[0].value,
      });
    }

    return this.userService.userObject(user);
  }
}
