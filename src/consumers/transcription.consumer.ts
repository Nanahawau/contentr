import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model } from 'mongoose';
import { Transcription } from 'src/transcription/schemas/transcription.schema';
import { TranscriptionService } from 'src/transcription/transcription.service';
import {
  TranscriptionJobData,
  TranscriptionJobResponse,
  UploadJobResponse,
} from './consumers.type';
import { Logger } from '@nestjs/common';
import { getQueueName } from 'src/common/helpers/helper-functions';
import { AwsService } from 'src/integrations/aws/aws.service';
import { Upload } from 'src/upload/schemas/upload.schema';
import { Readable } from 'stream';

@Processor('transcriptionQueue')
export class TranscriptionConsumer extends WorkerHost {
  private readonly logger = new Logger(TranscriptionConsumer.name);
  constructor(
    @InjectModel(Transcription.name)
    private transcriptionModel: Model<Transcription>,
    private transcriptionService: TranscriptionService,
    private readonly awsService: AwsService,
    @InjectModel(Upload.name) private readonly uploadModel: Model<Upload>,
  ) {
    super();
  }

  async process(
    job: Job<TranscriptionJobData, any, string>,
  ): Promise<TranscriptionJobResponse> {
    this.logger.log({
      message: 'transcription consumer has started running',
    });
    try {
      let transcription;
      const { uploadId, userId } = job.data;
      const uploadedFile = await this.uploadModel.findOne({ _id: uploadId });

      console.log({ uploadedFile });

      if (!uploadedFile) {
        throw new Error('An error occurred in transcription queue');
      }

      const file = await this.awsService.fetchFromS3(uploadedFile.s3Key);

      transcription = await this.transcriptionModel.findOne({
        upload_id: uploadId,
        user_id: userId,
      });

      this.logger.log({ transcription });

      const multerFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: uploadedFile.original_name, 
        encoding: '7bit', // save encoding also create metadata object in upload 
        mimetype: 'application/octet-stream', 
        size: file.length,
        buffer: file,
        stream: new Readable(),
        destination: '',
        filename: '',
        path: '',
      };

      if (!transcription) {
        const transcribedText =
          await this.transcriptionService.transcribe(multerFile);
        transcription = await this.transcriptionModel.create({
          upload_id: uploadId,
          user_id: userId,
          text: transcribedText,
        });

        this.logger.log({ transcribedText });
      }

      return {
        text: transcription.text,
        userId: transcription.user_id,
        uploadId: transcription.upload_id,
      };
    } catch (error) {
      this.logger.error({ message: error?.message, stack: error?.stack });
      throw new Error('An error occurred in transcription queue');
    }
  }
}
