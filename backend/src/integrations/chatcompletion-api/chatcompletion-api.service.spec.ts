import { Test, TestingModule } from '@nestjs/testing';
import { ChatcompletionApiService } from './chatcompletion-api.service';

describe('ChatcompletionApiService', () => {
  let service: ChatcompletionApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatcompletionApiService],
    }).compile();

    service = module.get<ChatcompletionApiService>(ChatcompletionApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
