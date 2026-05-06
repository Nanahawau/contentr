import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigType } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import awsConfig from 'src/config/aws.config';
import { AwsService } from 'src/integrations/aws/aws.service';
import { Upload } from 'src/upload/schemas/upload.schema';
import { UploadJobResponse } from './consumers.type';
import { Inject, Logger } from '@nestjs/common';
import { QueueName } from 'src/common/constants/queue.constants';

@Processor(QueueName.UPLOAD)
export class UploadConsumer extends WorkerHost {
  private readonly logger = new Logger(UploadConsumer.name);
  constructor(
    private readonly awsService: AwsService,
    @InjectModel(Upload.name) private readonly uploadModel: Model<Upload>,
    @Inject(awsConfig.KEY)
    private readonly configService: ConfigType<typeof awsConfig>,
  ) {
    super();
  }

  async process(
    job: Job<any, any, string>,
  ): Promise<UploadJobResponse> {
    try {
      this.logger.log({
        message: 'upload consumer has started running',
      });
      const { file, hashedFile, userId } = job.data;
      let uploadedFile = await this.uploadModel.findOne({ hash: hashedFile });
      let uploadToS3 = false;

      if (!uploadedFile) {
        uploadToS3 = true;
      }

      if (uploadToS3) {
        const uploadResponse = await this.awsService.uploadToS3({
          file,
          key: String(userId),
        });

        uploadedFile = await this.uploadModel.create({
          user_id: userId,
          hash: hashedFile,
          request_id: uploadResponse.request_id,
        });
      }

      return { file, userId, uploadId: uploadedFile?.id };
    } catch (error) {
      this.logger.error({ message: error?.message, stack: error?.stack });
      throw new Error('An error occurred in upload queue');
    }
  }
}
