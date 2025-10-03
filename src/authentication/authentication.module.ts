import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { ConfigModule, ConfigType } from '@nestjs/config';
import googleOauthConfig from 'src/config/google-oauth.config';
import { JwtStrategy } from './strategy/jwt.strategy';
import { GoogleOauthStrategy } from './strategy/social.strategy';
import { SocialsOauthGuard } from './guard/socials-oauth.guard';
import { GlobalAuthGuard } from './guard/globalauth.guard';
import { JwtAuthGuard } from './guard/jwt.guard';
import jwtConfig from 'src/config/jwt.config';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(googleOauthConfig),
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [jwtConfig.KEY],
      useFactory: async (configService: ConfigType<typeof jwtConfig>) => ({
        secret: configService.secret,
        signOptions: { expiresIn: configService.jwtExpiry || '60s' },
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
