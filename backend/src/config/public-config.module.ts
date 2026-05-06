import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublicConfigController } from './public-config.controller';
import defaultConfig from './default.config';

@Module({
  imports: [ConfigModule.forFeature(defaultConfig)],
  controllers: [PublicConfigController],
})
export class PublicConfigModule {}