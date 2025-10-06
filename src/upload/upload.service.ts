import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateUploadDto } from './dto/create-upload.dto';
import {
  generateFileHash,
  generateS3Key,
} from '../common/helpers/helper-functions';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer } from 'bullmq';
import { ConfigType } from '@nestjs/config';
import defaultConfig from 'src/config/default.config';
import { AwsService } from 'src/integrations/aws/aws.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Upload } from './schemas/upload.schema';

@Injectable()
export class UploadService {
  constructor(
    @InjectFlowProducer() private readonly flowProducer: FlowProducer,
    @Inject(defaultConfig.KEY)
    private configService: ConfigType<typeof defaultConfig>,
    private readonly awsService: AwsService,
    @InjectModel(Upload.name) private readonly uploadModel: Model<Upload>,
  ) {}
  async create(createUploadDto: CreateUploadDto): Promise<void> {
    const { file, platforms } = createUploadDto;

    if (!Array.isArray(platforms))
      throw new BadRequestException('Platforms is not an array');

    const hashedFile = generateFileHash(file);
    const userId = '1'; // todo: get from auth context

    let uploadedFile = await this.uploadModel.findOne({ hash: hashedFile });
    const key = generateS3Key(userId, file.originalname);

    if (!uploadedFile) {
       await this.awsService.uploadToS3({
        file,
        key,
      });

      console.log({orig: file.originalname})

      uploadedFile = await this.uploadModel.create({
        user_id: userId,
        hash: hashedFile,
        s3Key: key,
        original_name: file.originalname || 'unknown',
      });
    }

    await this.flowProducer.add({
      name: 'generateContent',
      queueName: this.configService.llmQueue,
      data: { platforms },
      children: [
        {
          name: 'transcribe',
          queueName: this.configService.transcriptionQueue,
          data: { uploadId: uploadedFile.id, userId },
        },
      ],
    });
  }
}
