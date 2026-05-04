import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { JwtStrategy } from './strategy/jwt.strategy';
import { GoogleOauthStrategy } from './strategy/social.strategy';
import { SocialsOauthGuard } from './guard/socials-oauth.guard';
import { GlobalAuthGuard } from './guard/globalauth.guard';
import { JwtAuthGuard } from './guard/jwt.guard';
import jwtConfig from 'src/config/jwt.config';
import emailConfig from 'src/config/email.config';
import googleOauthConfig from 'src/config/google-oauth.config';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(emailConfig),
    ConfigModule.forFeature(googleOauthConfig),
    UserModule,
    PassportModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [jwtConfig.KEY],
      useFactory: (config: ConfigType<typeof jwtConfig>) => ({
        secret: config.secret,
        signOptions: { expiresIn: config.accessTokenExpiry },
      }),
    }),
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    JwtStrategy,
    GoogleOauthStrategy,
    SocialsOauthGuard,
    GlobalAuthGuard,
    JwtAuthGuard,
  ],
})
export class AuthenticationModule {}