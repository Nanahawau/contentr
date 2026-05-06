import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { AwsService } from 'src/integrations/aws/aws.service';
import { Upload, UploadDocument } from './schemas/upload.schema';
import { CreateUploadDto } from './dto/create-upload.dto';
import { generateFileHash } from '../common/helpers/helper-functions';
import { UploadStatus } from './enums/upload-status.enum';
import { JobName, QueueName } from 'src/common/constants/queue.constants';

@Injectable()
export class UploadService {
  constructor(
    @InjectFlowProducer() private readonly flowProducer: FlowProducer,
    private readonly awsService: AwsService,
    @InjectModel(Upload.name) private readonly uploadModel: Model<Upload>,
  ) {}

  async create(createUploadDto: CreateUploadDto): Promise<{ upload: UploadDocument; isDuplicate: boolean }> {
    const { file, platforms, userId } = createUploadDto;

    if (!platforms.length) {
      throw new BadRequestException('At least one platform must be selected');
    }

    const hash = generateFileHash(file);

    const existingUpload = await this.uploadModel.findOne({ hash, user_id: userId });

    if (existingUpload && existingUpload.status !== UploadStatus.FAILED) {
      return { upload: existingUpload, isDuplicate: true };
    }

    const s3Key = existingUpload
      ? existingUpload.s3Key
      : `${userId}/${randomBytes(8).toString('hex')}_${file.originalname}`;

    if (!existingUpload) {
      await this.awsService.uploadToS3({ file, key: s3Key });
    }

    const upload = await this.uploadModel.create({
      user_id: userId,
      hash,
      s3Key,
      original_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      platforms,
      status: UploadStatus.PENDING,
    });

    await this.flowProducer.add({
      name: JobName.GENERATE_CONTENT,
      queueName: QueueName.GENERATE_CONTENT,
      data: { platforms, userId, uploadId: upload.id as string },
      children: [
        {
          name: JobName.TRANSCRIBE,
          queueName: QueueName.TRANSCRIPTION,
          data: { uploadId: upload.id as string, userId },
        },
      ],
    });

    return { upload, isDuplicate: false };
  }

  async findAll(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<{ uploads: UploadDocument[]; nextCursor: string | null }> {
    const filter: Record<string, unknown> = { user_id: userId };
    if (cursor) {
      filter['_id'] = { $lt: cursor };
    }

    const uploads = await this.uploadModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1);

    const hasNextPage = uploads.length > limit;
    const page = hasNextPage ? uploads.slice(0, limit) : uploads;
    const nextCursor = hasNextPage ? String(page[page.length - 1]._id) : null;

    return { uploads: page, nextCursor };
  }

  async findOne(uploadId: string, userId: string): Promise<UploadDocument> {
    const upload = await this.uploadModel.findOne({
      _id: uploadId,
      user_id: userId,
    });

    if (!upload) {
      throw new NotFoundException('Upload not found');
    }

    return upload;
  }

  async updateStatus(uploadId: string, status: UploadStatus): Promise<void> {
    await this.uploadModel.findByIdAndUpdate(uploadId, { status });
  }
}
