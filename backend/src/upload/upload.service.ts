import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigType } from '@nestjs/config';
import { FlowProducer } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { AwsService } from 'src/integrations/aws/aws.service';
import { Upload, UploadDocument } from './schemas/upload.schema';
import { generateFileHash } from '../common/helpers/helper-functions';
import { UploadStatus } from './enums/upload-status.enum';
import { JobName, QueueName } from 'src/common/constants/queue.constants';
import { QualityCheckService, QualityResult } from './quality-check.service';
import { CreditService, CreditEstimate } from '../credits/credit.service';
import { Platform } from 'src/common/enums/platform.enum';
import defaultConfig from 'src/config/default.config';

type AnalysisRecord = {
  hash: string;
  score: number;
  userId: string;
  durationSeconds: number;
  wordCount: number;
  platforms: Platform[];
  creditEstimate: CreditEstimate;
  s3Key: string;
  fileSize: number;
  mimetype: string;
  originalname: string;
};

export type AnalyseResult = QualityResult & {
  analysisToken: string;
  creditEstimate: CreditEstimate;
};

@Injectable()
export class UploadService {
  constructor(
    @InjectFlowProducer() private readonly flowProducer: FlowProducer,
    private readonly awsService: AwsService,
    private readonly qualityCheckService: QualityCheckService,
    private readonly creditService: CreditService,
    @InjectModel(Upload.name) private readonly uploadModel: Model<Upload>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(defaultConfig.KEY)
    private readonly config: ConfigType<typeof defaultConfig>,
  ) {}

  validateFileSize(file: Express.Multer.File): void {
    const maxBytes = this.config.maxUploadSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `File too large. Maximum size is ${this.config.maxUploadSizeMb}MB.`,
      );
    }
  }

  async analyse(
    file: Express.Multer.File,
    userId: string,
    platforms: Platform[],
  ): Promise<AnalyseResult> {
    this.validateFileSize(file);
    const result = await this.qualityCheckService.check(file);

    if (result.band === 'rejected') {
      throw new UnprocessableEntityException({
        score: result.score,
        reason: result.reason,
      });
    }

    const analysisToken = randomBytes(16).toString('hex');
    const s3Key = `${userId}/${analysisToken}_${file.originalname}`;

    await this.awsService.uploadToS3({ file, key: s3Key, tags: { lifecycle: 'pending' } });

    const fileSizeMb = file.size / (1024 * 1024);
    const creditEstimate = await this.creditService.estimateCost(
      result.durationSeconds,
      result.wordCount,
      fileSizeMb,
      platforms,
    );

    const hash = generateFileHash(file);
    const record: AnalysisRecord = {
      hash,
      score: result.score,
      userId,
      durationSeconds: result.durationSeconds,
      wordCount: result.wordCount,
      platforms,
      creditEstimate,
      s3Key,
      fileSize: file.size,
      mimetype: file.mimetype,
      originalname: file.originalname,
    };

    await this.cacheManager.set(
      `analysis:${analysisToken}`,
      record,
      this.config.analysisTokenTtlMs,
    );

    return { ...result, analysisToken, creditEstimate };
  }

  async confirm(
    analysisToken: string,
    userId: string,
  ): Promise<{ upload: UploadDocument; isDuplicate: boolean }> {
    const record = await this.cacheManager.get<AnalysisRecord>(
      `analysis:${analysisToken}`,
    );

    if (!record) {
      throw new BadRequestException(
        'Invalid or expired analysis token. Please re-analyse the file.',
      );
    }

    if (record.userId !== userId) {
      throw new BadRequestException(
        'Analysis token does not match the requesting user.',
      );
    }

    await this.cacheManager.del(`analysis:${analysisToken}`);

    const existingUpload = await this.uploadModel.findOne({
      hash: record.hash,
      user_id: userId,
    });

    if (existingUpload && existingUpload.status !== UploadStatus.FAILED) {
      return { upload: existingUpload, isDuplicate: true };
    }

    const s3Key = existingUpload ? existingUpload.s3Key : record.s3Key;
    const uploadId = new Types.ObjectId();
    const creditsToReserve = record.creditEstimate.total;

    await this.creditService.reserve(userId, uploadId.toString(), creditsToReserve);

    try {
      if (!existingUpload) {
        await this.awsService.untagObject(record.s3Key);
      }

      const upload = await this.uploadModel.create({
        _id: uploadId,
        user_id: userId,
        hash: record.hash,
        s3Key,
        original_name: record.originalname,
        mime_type: record.mimetype,
        file_size: record.fileSize,
        platforms: record.platforms,
        status: UploadStatus.PENDING,
        quality_score: record.score,
        metadata: {
          duration_seconds: record.durationSeconds,
          word_count: record.wordCount,
        },
        credits_reserved: creditsToReserve,
      });

      await this.flowProducer.add({
        name: JobName.GENERATE_CONTENT,
        queueName: QueueName.GENERATE_CONTENT,
        data: { platforms: record.platforms, userId, uploadId: upload.id as string },
        children: [
          {
            name: JobName.TRANSCRIBE,
            queueName: QueueName.TRANSCRIPTION,
            data: { uploadId: upload.id as string, userId },
          },
        ],
      });

      return { upload, isDuplicate: false };
    } catch (error) {
      await this.creditService.release(userId, uploadId.toString(), creditsToReserve);
      throw error;
    }
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
