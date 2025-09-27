import { Module } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { TranscriptionController } from './transcription.controller';
import { WhisperApiService } from '../integrations/whisper-api/whisper-api.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Transcription,
  TranscriptionSchema,
} from './schemas/transcription.schema';

@Module({
  controllers: [TranscriptionController],
  imports: [
    MongooseModule.forFeature([
      { name: Transcription.name, schema: TranscriptionSchema },
    ]),
  ],
  providers: [
    TranscriptionService,
    {
      provide: 'TRANSCRIPTION_PROVIDER',
      useClass: WhisperApiService,
    },
  ],
})
export class TranscriptionModule {}
