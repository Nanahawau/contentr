import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { Platform } from 'src/common/enums/platform.enum';
import { UploadStatus } from './enums/upload-status.enum';
import { AnalyseUploadDto } from './dto/analyse-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

const mockUpload = {
  _id: 'upload-id-123',
  id: 'upload-id-123',
  user_id: 'user-id-123',
  original_name: 'podcast.mp3',
  s3Key: 'user-id-123/abcdef_podcast.mp3',
  hash: 'sha256hashvalue',
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

const mockUser = {
  id: 'user-id-123',
  email: 'user@example.com',
  verified: true,
};
const mockResponse = { status: jest.fn() };

const mockUploadService = {
  analyse: jest.fn(),
  confirm: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
};

describe('UploadController', () => {
  let controller: UploadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    jest.clearAllMocks();
  });

  describe('analyse', () => {
    const analyseDto: AnalyseUploadDto = {
      platforms: [Platform.TWITTER, Platform.LINKEDIN],
    };

    it('delegates to service.analyse with the file, user id, and platforms', async () => {
      const analyseResult = {
        score: 8,
        band: 'pass',
        reason: 'Good.',
        durationSeconds: 120,
        wordCount: 0,
        analysisToken: 'token-abc',
        creditEstimate: {
          transcriptionCost: 20,
          storageCost: 1,
          generationCost: 13,
          total: 34,
        },
      };
      mockUploadService.analyse.mockResolvedValue(analyseResult);

      const result = await controller.analyse(mockFile, analyseDto, mockUser);

      expect(mockUploadService.analyse).toHaveBeenCalledWith(
        mockFile,
        mockUser.id,
        analyseDto.platforms,
      );
      expect(result).toBe(analyseResult);
    });
  });

  describe('confirm', () => {
    const confirmDto: ConfirmUploadDto = { analysisToken: 'valid-token' };

    it('returns 201 and the upload when a new file is confirmed', async () => {
      mockUploadService.confirm.mockResolvedValue({
        upload: mockUpload,
        isDuplicate: false,
      });

      const result = await controller.confirm(confirmDto, mockUser, mockResponse as never);

      expect(mockUploadService.confirm).toHaveBeenCalledWith(
        confirmDto.analysisToken,
        mockUser.id,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(result).toBe(mockUpload);
    });

    it('returns 200 and the existing upload when the file is a duplicate', async () => {
      mockUploadService.confirm.mockResolvedValue({
        upload: mockUpload,
        isDuplicate: true,
      });

      const result = await controller.confirm(confirmDto, mockUser, mockResponse as never);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(result).toBe(mockUpload);
    });
  });

  describe('findAll', () => {
    it('delegates to service.findAll with the given limit and no cursor', async () => {
      const page = { uploads: [mockUpload], nextCursor: null };
      mockUploadService.findAll.mockResolvedValue(page);

      const result = await controller.findAll(mockUser, 20, undefined);

      expect(mockUploadService.findAll).toHaveBeenCalledWith(
        'user-id-123',
        20,
        undefined,
      );
      expect(result).toBe(page);
    });

    it('passes cursor to service.findAll when provided', async () => {
      const page = { uploads: [mockUpload], nextCursor: null };
      mockUploadService.findAll.mockResolvedValue(page);

      await controller.findAll(mockUser, 20, 'some-cursor-id');

      expect(mockUploadService.findAll).toHaveBeenCalledWith(
        'user-id-123',
        20,
        'some-cursor-id',
      );
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne with the upload id and user id', async () => {
      mockUploadService.findOne.mockResolvedValue(mockUpload);

      const result = await controller.findOne('upload-id-123', mockUser);

      expect(mockUploadService.findOne).toHaveBeenCalledWith(
        'upload-id-123',
        'user-id-123',
      );
      expect(result).toBe(mockUpload);
    });
  });
});
