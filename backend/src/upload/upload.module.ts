import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { ConfigModule, ConfigType } from '@nestjs/config';
import defaultConfig from 'src/config/default.config';
import { BullModule } from '@nestjs/bullmq';
import { AwsModule } from 'src/integrations/aws/aws.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Upload, UploadSchema } from './schemas/upload.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Upload.name, schema: UploadSchema }]),
    AwsModule,
    ConfigModule.forFeature(defaultConfig),
    BullModule.registerFlowProducerAsync({
      imports: [ConfigModule],
      inject: [defaultConfig.KEY],
      useFactory: async (configService: ConfigType<typeof defaultConfig>) => ({
        name: configService.flowProducerName,
      }),
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
