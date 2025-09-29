import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { ChatcompletionApiService } from 'src/integrations/chatcompletion-api/chatcompletion-api.service';
import { Content, ContentSchema } from './schemas/content.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import defaultConfig from 'src/config/default.config';

@Module({
  controllers: [ContentController],
  providers: [
    ContentService,
    {
      provide: 'CONTENT_PROVIDER',
      useClass: ChatcompletionApiService,
    },
  ],
  imports: [
    MongooseModule.forFeature([{ name: Content.name, schema: ContentSchema }]),
    ConfigModule.forFeature(defaultConfig),
  ],
})
export class ContentModule {}
