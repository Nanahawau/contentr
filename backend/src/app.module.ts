import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from './user/user.module';
import databaseConfig from './config/database.config';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import defaultConfig from './config/default.config';
import googleOauthConfig from './config/google-oauth.config';
import jwtConfig from './config/jwt.config';
import awsConfig from './config/aws.config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';
import { TranscriptionModule } from './transcription/transcription.module';
import { UploadModule } from './upload/upload.module';
import { BullModule } from '@nestjs/bullmq';
import { ConsumersModule } from './consumers/consumers.module';
import { NotificationModule } from './notification/notification.module';
import { ContentModule } from './content/content.module';
import { JwtAuthGuard } from './authentication/guard/jwt.guard';
// import { SocialsOauthGuard } from './authentication/guard/socials-oauth.guard';
import { GlobalAuthGuard } from './authentication/guard/globalauth.guard';
import { AwsModule } from './integrations/aws/aws.module';

@Module({
  imports: [
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
    AuthenticationModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [defaultConfig.KEY],
      useFactory: (configService: ConfigType<typeof defaultConfig>) => ({
        connection: {
          host: configService.redisHost,
          port: configService.redisPort,
        },
      }),
    }),
    UserModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [databaseConfig.KEY],
      useFactory: (dbConfig: ConfigType<typeof databaseConfig>) => ({
        uri: dbConfig.url,
      }),
    }),
    TranscriptionModule,
    UploadModule,
    ConsumersModule,
    NotificationModule,
    ContentModule,
    AwsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    JwtAuthGuard,
    // SocialsOauthGuard,
    {
      provide: 'APP_GUARD',
      useClass: GlobalAuthGuard,
    },
  ],
})
export class AppModule {}
