import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { Platform } from './enums/platform.enum';
import { UploadStatus } from './enums/upload-status.enum';

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

const mockUser = { id: 'user-id-123', email: 'user@example.com', verified: true };

const mockUploadService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
};

describe('UploadController', () => {
  let controller: UploadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: UploadService, useValue: mockUploadService }],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('delegates to service.create with parsed platforms and user id', async () => {
      mockUploadService.create.mockResolvedValue(mockUpload);
      const platforms = [Platform.TWITTER, Platform.LINKEDIN];

      const result = await controller.create(mockFile, JSON.stringify(platforms), mockUser);

      expect(mockUploadService.create).toHaveBeenCalledWith({
        file: mockFile,
        platforms,
        userId: mockUser.id,
      });
      expect(result).toBe(mockUpload);
    });
  });

  describe('findAll', () => {
    it('delegates to service.findAll with the given limit and no cursor', async () => {
      const page = { uploads: [mockUpload], nextCursor: null };
      mockUploadService.findAll.mockResolvedValue(page);

      const result = await controller.findAll(mockUser, 20, undefined);

      expect(mockUploadService.findAll).toHaveBeenCalledWith('user-id-123', 20, undefined);
      expect(result).toBe(page);
    });

    it('passes cursor to service.findAll when provided', async () => {
      const page = { uploads: [mockUpload], nextCursor: null };
      mockUploadService.findAll.mockResolvedValue(page);

      await controller.findAll(mockUser, 20, 'some-cursor-id');

      expect(mockUploadService.findAll).toHaveBeenCalledWith('user-id-123', 20, 'some-cursor-id');
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne with the upload id and user id', async () => {
      mockUploadService.findOne.mockResolvedValue(mockUpload);

      const result = await controller.findOne('upload-id-123', mockUser);

      expect(mockUploadService.findOne).toHaveBeenCalledWith('upload-id-123', 'user-id-123');
      expect(result).toBe(mockUpload);
    });
  });
});