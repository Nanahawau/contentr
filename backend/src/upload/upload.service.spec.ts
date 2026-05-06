import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { getFlowProducerToken } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UploadService } from './upload.service';
import { Upload } from './schemas/upload.schema';
import { AwsService } from 'src/integrations/aws/aws.service';
import { QualityCheckService } from './quality-check.service';
import { Platform } from './enums/platform.enum';
import { UploadStatus } from './enums/upload-status.enum';
import { JobName, QueueName } from 'src/common/constants/queue.constants';
import defaultConfig from '../config/default.config';

const MOCK_FILE_HASH =
  '73df71fdea120e1e0a800cd9febd75ce944d53183035e8c8bfeaa235bda237e9';

const mockUpload = {
  _id: 'upload-id-123',
  id: 'upload-id-123',
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

const mockAwsService = { uploadToS3: jest.fn() };
const mockFlowProducer = { add: jest.fn() };
const mockQualityCheckService = { check: jest.fn() };
const mockCacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
const mockConfig = { maxUploadSizeMb: 100, analysisTokenTtlMs: 900000 };

const validCacheRecord = {
  hash: MOCK_FILE_HASH,
  score: 8,
  userId: 'user-id-123',
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
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: defaultConfig.KEY, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    jest.clearAllMocks();
    mockUploadModel.find.mockReturnValue(mockQuery);
  });

  describe('analyse', () => {
    it('throws UnprocessableEntityException when quality check rejects the file', async () => {
      mockQualityCheckService.check.mockResolvedValue({
        score: 2,
        band: 'rejected',
        reason: 'Too short.',
      });

      await expect(service.analyse(mockFile, 'user-id-123')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('stores an analysis record in cache and returns the token for a passing file', async () => {
      mockQualityCheckService.check.mockResolvedValue({
        score: 8,
        band: 'pass',
        reason: 'Good quality.',
      });
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.analyse(mockFile, 'user-id-123');

      expect(result.band).toBe('pass');
      expect(result.analysisToken).toBeDefined();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('analysis:'),
        expect.objectContaining({
          hash: MOCK_FILE_HASH,
          userId: 'user-id-123',
          score: 8,
        }),
        mockConfig.analysisTokenTtlMs,
      );
    });

    it('stores an analysis record in cache and returns the token for a warn file', async () => {
      mockQualityCheckService.check.mockResolvedValue({
        score: 5,
        band: 'warn',
        reason: 'Low bitrate.',
      });
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.analyse(mockFile, 'user-id-123');

      expect(result.band).toBe('warn');
      expect(result.analysisToken).toBeDefined();
    });
  });

  describe('create', () => {
    const dto = {
      file: mockFile,
      platforms: [Platform.TWITTER, Platform.LINKEDIN],
      userId: 'user-id-123',
      analysisToken: 'valid-token',
    };

    it('throws BadRequestException when platforms array is empty', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      await expect(service.create({ ...dto, platforms: [] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when analysis token is missing from cache', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when token userId does not match the requesting user', async () => {
      mockCacheManager.get.mockResolvedValue({
        ...validCacheRecord,
        userId: 'different-user',
      });
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when token hash does not match the uploaded file', async () => {
      mockCacheManager.get.mockResolvedValue({
        ...validCacheRecord,
        hash: 'wrong-hash',
      });
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('deletes the token from cache after successful verification', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUploadModel.findOne.mockResolvedValue(null);
      mockAwsService.uploadToS3.mockResolvedValue(undefined);
      mockUploadModel.create.mockResolvedValue(mockUpload);
      mockFlowProducer.add.mockResolvedValue(undefined);

      await service.create(dto);

      expect(mockCacheManager.del).toHaveBeenCalledWith('analysis:valid-token');
    });

    it('uploads to S3 and creates a record when no duplicate hash exists for user', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUploadModel.findOne.mockResolvedValue(null);
      mockAwsService.uploadToS3.mockResolvedValue(undefined);
      mockUploadModel.create.mockResolvedValue(mockUpload);
      mockFlowProducer.add.mockResolvedValue(undefined);

      const result = await service.create(dto);

      expect(mockAwsService.uploadToS3).toHaveBeenCalledWith(
        expect.objectContaining({ file: mockFile }),
      );
      expect(mockUploadModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: dto.userId,
          original_name: mockFile.originalname,
          mime_type: mockFile.mimetype,
          file_size: mockFile.size,
          platforms: dto.platforms,
          status: UploadStatus.PENDING,
          quality_score: validCacheRecord.score,
        }),
      );
      expect(result).toEqual({ upload: mockUpload, isDuplicate: false });
    });

    it('returns the existing upload as a duplicate when status is pending', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      const pendingUpload = { ...mockUpload, status: UploadStatus.PENDING };
      mockUploadModel.findOne.mockResolvedValue(pendingUpload);

      const result = await service.create(dto);

      expect(result).toEqual({ upload: pendingUpload, isDuplicate: true });
      expect(mockAwsService.uploadToS3).not.toHaveBeenCalled();
      expect(mockUploadModel.create).not.toHaveBeenCalled();
      expect(mockFlowProducer.add).not.toHaveBeenCalled();
    });

    it('returns the existing upload as a duplicate when status is completed', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      const completedUpload = { ...mockUpload, status: UploadStatus.COMPLETED };
      mockUploadModel.findOne.mockResolvedValue(completedUpload);

      const result = await service.create(dto);

      expect(result).toEqual({ upload: completedUpload, isDuplicate: true });
      expect(mockUploadModel.create).not.toHaveBeenCalled();
    });

    it('creates a new record and reuses the S3 key when the existing upload has failed', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      const failedUpload = { ...mockUpload, status: UploadStatus.FAILED };
      mockUploadModel.findOne.mockResolvedValue(failedUpload);
      mockUploadModel.create.mockResolvedValue(mockUpload);
      mockFlowProducer.add.mockResolvedValue(undefined);

      const result = await service.create(dto);

      expect(result.isDuplicate).toBe(false);
      expect(mockAwsService.uploadToS3).not.toHaveBeenCalled();
      expect(mockUploadModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ s3Key: failedUpload.s3Key }),
      );
    });

    it('enqueues a generate-content parent job with a transcription child', async () => {
      mockCacheManager.get.mockResolvedValue(validCacheRecord);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUploadModel.findOne.mockResolvedValue(null);
      mockAwsService.uploadToS3.mockResolvedValue(undefined);
      mockUploadModel.create.mockResolvedValue(mockUpload);
      mockFlowProducer.add.mockResolvedValue(undefined);

      await service.create(dto);

      expect(mockFlowProducer.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: JobName.GENERATE_CONTENT,
          queueName: QueueName.GENERATE_CONTENT,
          children: expect.arrayContaining([
            expect.objectContaining({
              name: JobName.TRANSCRIBE,
              queueName: QueueName.TRANSCRIPTION,
              data: expect.objectContaining({ uploadId: mockUpload.id }),
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
      const uploads = Array.from({ length: 21 }, (_, i) => ({
        ...mockUpload,
        _id: `id-${i}`,
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
