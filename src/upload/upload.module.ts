import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { ConsumersModule } from 'src/consumers/consumers.module';

@Module({
  imports: [ConsumersModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
