import { Module } from '@nestjs/common';
import { ChatcompletionApiService } from './chatcompletion-api.service';

@Module({
  providers: [ChatcompletionApiService]
})
export class ChatcompletionApiModule {}