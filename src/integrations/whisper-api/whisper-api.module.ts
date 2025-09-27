import { Module } from '@nestjs/common';
import { WhisperApiService } from './whisper-api.service';

@Module({
  providers: [WhisperApiService],
  exports: [WhisperApiService],
})
export class WhisperApiModule {}
