import { Test, TestingModule } from '@nestjs/testing';
import { WhisperApiService } from './whisper-api.service';

describe('WhisperApiService', () => {
  let service: WhisperApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WhisperApiService],
    }).compile();

    service = module.get<WhisperApiService>(WhisperApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
