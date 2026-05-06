import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Public } from 'src/common/decorator/public.decorator';
import defaultConfig from './default.config';

type PublicConfig = {
  maxUploadSizeMb: number;
};

@Public()
@Controller('config')
export class PublicConfigController {
  constructor(
    @Inject(defaultConfig.KEY) private readonly config: ConfigType<typeof defaultConfig>,
  ) {}

  @Get()
  getConfig(): PublicConfig {
    return {
      maxUploadSizeMb: this.config.maxUploadSizeMb,
    };
  }
}
