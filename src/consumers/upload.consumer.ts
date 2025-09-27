import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigType } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import awsConfig from 'src/config/aws.config';
import { AwsService } from 'src/integrations/aws/aws.service';
import { Upload } from 'src/upload/schemas/upload.schema';
import { UploadJobData, UploadJobResponse } from './consumers.type';

@Processor('uploadQueue')
export class UploadConsumer extends WorkerHost {
  constructor(
    private readonly awsService: AwsService,
    @InjectModel(Upload.name) private readonly uploadModel: Model<Upload>,
    private readonly configService: ConfigType<typeof awsConfig>,
  ) {
    super();
  }

  async process(
    job: Job<UploadJobData, any, string>,
  ): Promise<UploadJobResponse> {
    try {
      const { file, hashedFile, userId } = job.data;
      let uploadedFile = await this.uploadModel.findOne({ hash: hashedFile });
      let uploadToS3 = false;

      if (!uploadedFile || (uploadedFile && !uploadedFile.request_id)) {
        uploadToS3 = true;
      }

      if (uploadToS3) {
        const uploadResponse = await this.awsService.uploadToS3({
          file,
          key: userId,
        });

        uploadedFile = await this.uploadModel.create({
          user_id: userId,
          hash: hashedFile,
          request_id: uploadResponse.request_id,
        });
      }

      return { file, userId, uploadId: uploadedFile?.id };
    } catch (error) {
      throw new Error('An error occurred in upload queue');
    }
  }
}
