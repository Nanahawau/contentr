import { Module } from '@nestjs/common';
import { WhisperApiService } from './whisper-api.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [WhisperApiService],
  exports: [WhisperApiService],
  imports: [ConfigModule]
})
export class WhisperApiModule {}
