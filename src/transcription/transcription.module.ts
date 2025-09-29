import { Module } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { TranscriptionController } from './transcription.controller';
import { WhisperApiService } from '../integrations/whisper-api/whisper-api.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Transcription,
  TranscriptionSchema,
} from './schemas/transcription.schema';
import { ConfigModule } from '@nestjs/config';
import defaultConfig from 'src/config/default.config';
import { ConsumersModule } from 'src/consumers/consumers.module';

@Module({
  controllers: [TranscriptionController],
  imports: [
    MongooseModule.forFeature([
      { name: Transcription.name, schema: TranscriptionSchema },
    ]),
    ConfigModule.forFeature(defaultConfig),
  ],
  providers: [
    TranscriptionService,
    {
      provide: 'TRANSCRIPTION_PROVIDER',
      useClass: WhisperApiService,
    },
  ],
  exports: [TranscriptionService, 'TRANSCRIPTION_PROVIDER']
})
export class TranscriptionModule {}
