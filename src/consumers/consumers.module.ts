import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import defaultConfig from 'src/config/default.config';
import { NotificationService } from 'src/notification/notification.service';
import { TranscriptionService } from 'src/transcription/transcription.service';
import { UploadService } from 'src/upload/upload.service';

@Module({
  providers: [UploadService, TranscriptionService, NotificationService],
  imports: [
    BullModule.registerQueueAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigType<typeof defaultConfig>) => ({
        name: configService.uploadQueue,
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
      inject: [ConfigService],
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
      inject: [ConfigService],
      useFactory: async (configService: ConfigType<typeof defaultConfig>) => ({
        name: configService.llmQueue,
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
      inject: [ConfigService],
      useFactory: async (configService: ConfigType<typeof defaultConfig>) => ({
        name: configService.flowProducerName,
      }),
    }),
  ],
  exports: [],
})
export class ConsumersModule {}
