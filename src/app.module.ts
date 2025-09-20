import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from './user/user.module';
import databaseConfig from './config/database.config';
import { ConfigModule, ConfigType } from '@nestjs/config';
import defaultConfig from './config/default.config';
import googleOauthConfig from './config/google-oauth.config';
import jwtConfig from './config/jwt.config';
import awsConfig from './config/aws.config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';
import { TranscriptionModule } from './transcription/transcription.module';

@Module({
  imports: [
    AuthenticationModule,
    UserModule,
    ConfigModule.forRoot({
      load: [
        databaseConfig,
        defaultConfig,
        googleOauthConfig,
        jwtConfig,
        awsConfig,
      ],
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [databaseConfig.KEY],
      useFactory: async (dbConfig: ConfigType<typeof databaseConfig>) => ({
        uri: dbConfig.url,
      }),
    }),
    TranscriptionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
