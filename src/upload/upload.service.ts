import { Injectable } from '@nestjs/common';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { generateFileHash } from '../common/helpers/helper-functions';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer } from 'bullmq';
import { ConfigType } from '@nestjs/config';
import defaultConfig from 'src/config/default.config';

@Injectable()
export class UploadService {
  constructor(
    @InjectFlowProducer() private readonly flowProducer: FlowProducer,
    private configService: ConfigType<typeof defaultConfig>,
  ) {}
  async create(createUploadDto: CreateUploadDto): void {
    const { file } = createUploadDto;
    const hashedFile = generateFileHash(file);
    const user_id = 1; // todo: get from auth context

    await this.flowProducer.add({
      name: this.configService.flowProducerName,
      queueName: this.configService.uploadQueue,
      data: {
        file,
        hashedFile,
        userId: user_id,
      },
      children: [
        {
          name: 'transcribe',
          queueName: this.configService.transcriptionQueue,
          data: {},
          children: [
            {
              name: 'generateContent',
              queueName: this.configService.llmQueue,
              data: {},
            },
          ],
        },
      ],
    });
  }
}
