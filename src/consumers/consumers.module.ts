import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import defaultConfig from 'src/config/default.config';
import { TranscriptionModule } from 'src/transcription/transcription.module';
import { AwsModule } from 'src/integrations/aws/aws.module';
import { UploadModule } from 'src/upload/upload.module';
import { TranscriptionConsumer } from './transcription.consumer';
import { GenerateContentQueue } from './generate-content.consumer';
import { MongooseModule } from '@nestjs/mongoose';
import { Upload, UploadSchema } from 'src/upload/schemas/upload.schema';
import awsConfig from 'src/config/aws.config';
import {
  Transcription,
  TranscriptionSchema,
} from 'src/transcription/schemas/transcription.schema';
import { Content, ContentSchema } from 'src/content/schemas/content.schema';
import { ContentModule } from 'src/content/content.module';

@Module({
  providers: [TranscriptionConsumer, GenerateContentQueue],
  imports: [
    UploadModule,
    TranscriptionModule,
    ContentModule,
    AwsModule,
    ConfigModule.forFeature(awsConfig),
    ConfigModule.forFeature(defaultConfig),
    MongooseModule.forFeature([
      { name: Upload.name, schema: UploadSchema },
      { name: Transcription.name, schema: TranscriptionSchema },
      { name: Content.name, schema: ContentSchema },
    ]),
    BullModule.registerQueueAsync({
      imports: [ConfigModule],
      inject: [defaultConfig.KEY],
      useFactory: async (configService: ConfigType<typeof defaultConfig>) => ({
        name: configService.transcriptionQueue,
        defaultJobOptions: {
          removeOnComplete: configService.removeOnCompleteValue,
          removeOnFail: { count: configService.removeOnFailCount },
          attempts: configService.queueFailureAttempts,
          backoff: {
            type: configService.backOffType,
            delay: configService.backOffDelay,
          },
        },
      }),
    }),
    BullModule.registerQueueAsync({
      imports: [ConfigModule],
      inject: [defaultConfig.KEY],
      useFactory: async (configService: ConfigType<typeof defaultConfig>) => ({
        name: configService.generateContentQueue,
        defaultJobOptions: {
          removeOnComplete: configService.removeOnCompleteValue,
          removeOnFail: { count: configService.removeOnFailCount },
          attempts: configService.queueFailureAttempts,
          backoff: {
            type: configService.backOffType,
            delay: configService.backOffDelay,
          },
        },
      }),
    }),
    BullModule.registerFlowProducerAsync({
      imports: [ConfigModule],
      inject: [defaultConfig.KEY],
      useFactory: async (configService: ConfigType<typeof defaultConfig>) => ({
        name: configService.flowProducerName,
      }),
    }),
    TranscriptionModule,
  ],
  exports: [BullModule],
})
export class ConsumersModule {}
