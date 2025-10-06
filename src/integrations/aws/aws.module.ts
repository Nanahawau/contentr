import { Module } from '@nestjs/common';
import { AwsService } from './aws.service';
import { ConfigService } from 'aws-sdk';
import { ConfigModule } from '@nestjs/config';
import awsConfig from 'src/config/aws.config';

@Module({
  imports: [ConfigModule.forFeature(awsConfig)],
  providers: [AwsService],
  exports: [AwsService]
})
export class AwsModule {}
