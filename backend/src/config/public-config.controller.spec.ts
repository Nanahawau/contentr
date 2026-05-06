import { Test, TestingModule } from '@nestjs/testing';
import { PublicConfigController } from './public-config.controller';
import defaultConfig from './default.config';

const mockConfig = {
  maxUploadSizeMb: 100,
  openAIKey: 'secret-key',
  redisHost: 'redis',
  redisPort: 6379,
};

describe('PublicConfigController', () => {
  let controller: PublicConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicConfigController],
      providers: [{ provide: defaultConfig.KEY, useValue: mockConfig }],
    }).compile();

    controller = module.get<PublicConfigController>(PublicConfigController);
  });

  describe('getConfig', () => {
    it('returns maxUploadSizeMb from config', () => {
      const result = controller.getConfig();
      expect(result.maxUploadSizeMb).toBe(100);
    });

    it('only exposes the expected public fields', () => {
      const result = controller.getConfig();
      expect(Object.keys(result)).toEqual(['maxUploadSizeMb']);
    });

    it('does not leak sensitive config values', () => {
      const result = controller.getConfig();
      expect(result).not.toHaveProperty('openAIKey');
      expect(result).not.toHaveProperty('redisHost');
      expect(result).not.toHaveProperty('redisPort');
    });
  });
});
