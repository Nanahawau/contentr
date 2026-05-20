import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { getFlowProducerToken } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Types } from 'mongoose';
import { UploadService } from './upload.service';
import { Upload } from './schemas/upload.schema';
import { AwsService } from 'src/integrations/aws/aws.service';
import { QualityCheckService } from './quality-check.service';
import { CreditService } from '../credits/credit.service';
import { Platform } from 'src/common/enums/platform.enum';
import { UploadStatus } from './enums/upload-status.enum';
import { JobName, QueueName } from 'src/common/constants/queue.constants';
import defaultConfig from '../config/default.config';

const MOCK_FILE_HASH =
  '73df71fdea120e1e0a800cd9febd75ce944d53183035e8c8bfeaa235bda237e9';

const mockUploadId = new Types.ObjectId().toString();

const mockUpload = {
  _id: mockUploadId,
  id: mockUploadId,
  user_id: 'user-id-123',
  original_name: 'podcast.mp3',
  s3Key: 'user-id-123/abcdef_podcast.mp3',
  hash: MOCK_FILE_HASH,
  mime_type: 'audio/mpeg',
  file_size: 2048,
  platforms: [Platform.TWITTER, Platform.LINKEDIN],
  status: UploadStatus.PENDING,
  quality_score: 8,
};

const mockFile: Express.Multer.File = {
  fieldname: 'file',
  originalname: 'podcast.mp3',
  encoding: '7bit',
  mimetype: 'audio/mpeg',
  size: 2048,
  buffer: Buffer.from('mock audio content'),
  stream: null as never,
  destination: '',
  filename: '',
  path: '',
};

const mockQuery = {
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

const mockUploadModel = {
  findOne: jest.fn(),
  find: jest.fn().mockReturnValue(mockQuery),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const mockAwsService = { uploadToS3: jest.fn(), untagObject: jest.fn() };
const mockFlowProducer = { add: jest.fn() };
const mockQualityCheckService = { check: jest.fn() };
const mockCacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
const mockCreditService = {
  estimateCost: jest.fn(),
  reserve: jest.fn(),
  release: jest.fn(),
  charge: jest.fn(),
};
const mockConfig = { maxUploadSizeMb: 100, analysisTokenTtlMs: 900000 };

const mockCreditEstimate = {
  transcriptionCost: 20,
  storageCost: 1,
  generationCost: 13,
  total: 34,
};

const mockPlatforms = [Platform.TWITTER, Platform.LINKEDIN];

const validCacheRecord = {
  hash: MOCK_FILE_HASH,
  score: 8,
  userId: 'user-id-123',
  durationSeconds: 120,
  wordCount: 0,
  platforms: mockPlatforms,
  creditEstimate: mockCreditEstimate,
  s3Key: 'user-id-123/token123_podcast.mp3',
  fileSize: 2048,
  mimetype: 'audio/mpeg',
  originalname: 'podcast.mp3',
};

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: getModelToken(Upload.name), useValue: mockUploadModel },
        { provide: AwsService, useValue: mockAwsService },
        { provide: getFlowProducerToken(), useValue: mockFlowProducer },
        { provide: QualityCheckService, useValue: mockQualityCheckService },
        { provide: CreditService, useValue: mockCreditService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: defaultConfig.KEY, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    jest.clearAllMocks();
    mockUploadModel.find.mockReturnValue(mockQuery);
    mockCreditService.estimateCost.mockResolvedValue(mockCreditEstimate);
    mockCreditService.reserve.mockResolvedValue(undefined);
    mockCreditService.release.mockResolvedValue(undefined);
  });

  describe('analyse', () => {
    it('throws UnprocessableEntityException when quality check rejects the file', async () => {
      mockQualityCheckService.check.mockResolvedValue({
        score: 2,
        band: 'rejected',
        reason: 'Too short.',
        durationSeconds: 0,
        wordCount: 0,
      });

      await expect(
        service.analyse(mockFile, 'user-id-123', mockPlatforms),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('does not upload to S3 when quality check rejects the file', async () => {
      mockQualityCheckService.check.mockResolvedValue({
        score: 2,
        band: 'rejected',
        reason: 'Too short.',
        durationSeconds: 0,
        wordCount: 0,
      });

      await service.analyse(mockFile, 'user-id-123', mockPlatforms).catch(() => {});

      expect(mockAwsService.uploadToS3).not.toHaveBeenCalled();
    });

    it('uploads to S3 with lifecycle=pending tag and caches the record for a passing file', async () => {
      mockQualityCheckService.check.mockResolvedValue({
        score: 8,
        band: 'pass',
        reason: 'Good quality.',
        durationSeconds: 120,
        wordCount: 0,
      });
      mockAwsService.uploadToS3.mockResolvedValue({ success: true });
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.analyse(mockFile, 'user-id-123', mockPlatforms);

      expect(mockAwsService.uploadToS3).toHaveBeenCalledWith(
        expect.objectContaining({ tags: { lifecycle: 'pending' } }),
      );
      expect(result.analysisToken).toBeDefined();
      expect(result.creditEstimate).toEqual(mockCreditEstimate);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('analysis:'),
        expect.objectContaining({
          hash: MOCK_FILE_HASH,
          userId: 'user-id-123',
          score: 8,
          durationSeconds: 120,
          platforms: mockPlatforms,
          creditEstimate: mockCreditEstimate,
          fileSize: mockFile.size,
          mimetype: mockFile.mimetype,
          originalname: mockFile.originalname,
        }),
        mockConfig.analysisTokenTtlMs,
      );
    });

    it('uploads to S3 with lifecycle=pending tag for a warn file', async () => {
      mockQualityCheckService.check.mockResolvedValue({
        score: 5,
        band: 'warn',
        reason: 'Low bitrate.',
        durationSeconds: 45,
        wordCount: 0,
      });
      mockAwsService.uploadToS3.mockResolvedValue({ success: true });
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.analyse(mockFile, 'user-id-123', mockPlatforms);

      expect(result.band).toBe('warn');
      expect(mockAwsService.uploadToS3).toHaveBeenCalledWith(
        expect.objectContaining({ tags: { lifecycle: 'pending' } }),
      );
    });
  });

  describe('confirm', () => {
    it('throws BadRequestException when analysis token is missing from cache', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      await expect(service.confirm('expired-token', 'user-id-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when token userId does not match the requesting user', async () => {
      mockCacheManager.get.mockResolvedValue({
        ...validCacheRecord,
        userId: 'different-user',
      });

      await expect(service.confirm('valid-token', 'user-id-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deletes the token from cache after successful verification', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUploadModel.findOne.mockResolvedValue(null);
      mockAwsService.untagObject.mockResolvedValue(undefined);
      mockUploadModel.create.mockResolvedValue(mockUpload);
      mockFlowProducer.add.mockResolvedValue(undefined);

      await service.confirm('valid-token', 'user-id-123');

      expect(mockCacheManager.del).toHaveBeenCalledWith('analysis:valid-token');
    });

    it('returns existing upload as duplicate without reserving credits when status is pending', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      const pendingUpload = { ...mockUpload, status: UploadStatus.PENDING };
      mockUploadModel.findOne.mockResolvedValue(pendingUpload);

      const result = await service.confirm('valid-token', 'user-id-123');

      expect(result).toEqual({ upload: pendingUpload, isDuplicate: true });
      expect(mockCreditService.reserve).not.toHaveBeenCalled();
      expect(mockUploadModel.create).not.toHaveBeenCalled();
    });

    it('returns existing upload as duplicate without reserving credits when status is completed', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      const completedUpload = { ...mockUpload, status: UploadStatus.COMPLETED };
      mockUploadModel.findOne.mockResolvedValue(completedUpload);

      const result = await service.confirm('valid-token', 'user-id-123');

      expect(result).toEqual({ upload: completedUpload, isDuplicate: true });
      expect(mockCreditService.reserve).not.toHaveBeenCalled();
    });

    it('untags the S3 object and creates a record when no duplicate exists', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUploadModel.findOne.mockResolvedValue(null);
      mockAwsService.untagObject.mockResolvedValue(undefined);
      mockUploadModel.create.mockResolvedValue(mockUpload);
      mockFlowProducer.add.mockResolvedValue(undefined);

      const result = await service.confirm('valid-token', 'user-id-123');

      expect(mockAwsService.untagObject).toHaveBeenCalledWith(validCacheRecord.s3Key);
      expect(mockUploadModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-id-123',
          hash: MOCK_FILE_HASH,
          s3Key: validCacheRecord.s3Key,
          original_name: validCacheRecord.originalname,
          mime_type: validCacheRecord.mimetype,
          file_size: validCacheRecord.fileSize,
          platforms: mockPlatforms,
          status: UploadStatus.PENDING,
          quality_score: validCacheRecord.score,
          credits_reserved: mockCreditEstimate.total,
        }),
      );
      expect(result.isDuplicate).toBe(false);
    });

    it('reserves credits before creating the upload record', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUploadModel.findOne.mockResolvedValue(null);
      mockAwsService.untagObject.mockResolvedValue(undefined);
      mockUploadModel.create.mockResolvedValue(mockUpload);
      mockFlowProducer.add.mockResolvedValue(undefined);

      const reserveOrder: string[] = [];
      mockCreditService.reserve.mockImplementation(() => {
        reserveOrder.push('reserve');
        return Promise.resolve();
      });
      mockUploadModel.create.mockImplementation(() => {
        reserveOrder.push('create');
        return Promise.resolve(mockUpload);
      });

      await service.confirm('valid-token', 'user-id-123');

      expect(reserveOrder).toEqual(['reserve', 'create']);
    });

    it('releases credits and rethrows when S3 untag fails', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUploadModel.findOne.mockResolvedValue(null);
      mockAwsService.untagObject.mockRejectedValue(new Error('S3 error'));

      await expect(service.confirm('valid-token', 'user-id-123')).rejects.toThrow('S3 error');

      expect(mockCreditService.release).toHaveBeenCalledWith(
        'user-id-123',
        expect.any(String),
        mockCreditEstimate.total,
      );
    });

    it('releases credits and rethrows when upload creation fails', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUploadModel.findOne.mockResolvedValue(null);
      mockAwsService.untagObject.mockResolvedValue(undefined);
      mockUploadModel.create.mockRejectedValue(new Error('DB error'));

      await expect(service.confirm('valid-token', 'user-id-123')).rejects.toThrow('DB error');

      expect(mockCreditService.release).toHaveBeenCalledWith(
        'user-id-123',
        expect.any(String),
        mockCreditEstimate.total,
      );
    });

    it('reuses the existing S3 key and skips untag for a failed duplicate', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      const failedUpload = { ...mockUpload, status: UploadStatus.FAILED };
      mockUploadModel.findOne.mockResolvedValue(failedUpload);
      mockUploadModel.create.mockResolvedValue(mockUpload);
      mockFlowProducer.add.mockResolvedValue(undefined);

      const result = await service.confirm('valid-token', 'user-id-123');

      expect(result.isDuplicate).toBe(false);
      expect(mockAwsService.untagObject).not.toHaveBeenCalled();
      expect(mockUploadModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ s3Key: failedUpload.s3Key }),
      );
    });

    it('uses platforms from the cache record, not from any external source', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUploadModel.findOne.mockResolvedValue(null);
      mockAwsService.untagObject.mockResolvedValue(undefined);
      mockUploadModel.create.mockResolvedValue(mockUpload);
      mockFlowProducer.add.mockResolvedValue(undefined);

      await service.confirm('valid-token', 'user-id-123');

      expect(mockUploadModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ platforms: validCacheRecord.platforms }),
      );
      expect(mockFlowProducer.add).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ platforms: validCacheRecord.platforms }),
        }),
      );
    });

    it('enqueues a generate-content parent job with a transcription child', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUploadModel.findOne.mockResolvedValue(null);
      mockAwsService.untagObject.mockResolvedValue(undefined);
      mockUploadModel.create.mockResolvedValue(mockUpload);
      mockFlowProducer.add.mockResolvedValue(undefined);

      await service.confirm('valid-token', 'user-id-123');

      expect(mockFlowProducer.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: JobName.GENERATE_CONTENT,
          queueName: QueueName.GENERATE_CONTENT,
          children: expect.arrayContaining([
            expect.objectContaining({
              name: JobName.TRANSCRIBE,
              queueName: QueueName.TRANSCRIPTION,
            }),
          ]),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('returns uploads with null nextCursor when results fit within the limit', async () => {
      const uploads = [mockUpload, { ...mockUpload, _id: 'upload-id-456' }];
      mockQuery.limit.mockResolvedValue(uploads);

      const result = await service.findAll('user-id-123', 20);

      expect(result.uploads).toEqual(uploads);
      expect(result.nextCursor).toBeNull();
    });

    it('returns nextCursor and trims the extra item when results exceed the limit', async () => {
      const uploads = Array.from({ length: 21 }, (_, index) => ({
        ...mockUpload,
        _id: `id-${index}`,
      }));
      mockQuery.limit.mockResolvedValue(uploads);

      const result = await service.findAll('user-id-123', 20);

      expect(result.uploads).toHaveLength(20);
      expect(result.nextCursor).toBe('id-19');
    });

    it('adds an _id less-than filter when a cursor is provided', async () => {
      mockQuery.limit.mockResolvedValue([]);

      await service.findAll('user-id-123', 20, 'cursor-id-xyz');

      expect(mockUploadModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ _id: { $lt: 'cursor-id-xyz' } }),
      );
    });

    it('does not include an _id filter when no cursor is provided', async () => {
      mockQuery.limit.mockResolvedValue([]);

      await service.findAll('user-id-123', 20);

      expect(mockUploadModel.find).toHaveBeenCalledWith(
        expect.not.objectContaining({ _id: expect.anything() }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the upload when found', async () => {
      mockUploadModel.findOne.mockResolvedValue(mockUpload);

      const result = await service.findOne('upload-id-123', 'user-id-123');

      expect(mockUploadModel.findOne).toHaveBeenCalledWith({
        _id: 'upload-id-123',
        user_id: 'user-id-123',
      });
      expect(result).toBe(mockUpload);
    });

    it('throws NotFoundException when the upload does not exist', async () => {
      mockUploadModel.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent-id', 'user-id-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('scopes the query to the requesting user', async () => {
      mockUploadModel.findOne.mockResolvedValue(null);

      await service.findOne('upload-id-123', 'user-id-123').catch(() => {});

      expect(mockUploadModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-id-123' }),
      );
    });
  });
});
