import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import jwtConfig from '../config/jwt.config';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
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
  providers: [AuthenticationService],
})
export class AuthenticationModule {}
