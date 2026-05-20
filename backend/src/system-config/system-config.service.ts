import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemConfig } from './schemas/system-config.schema';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectModel(SystemConfig.name)
    private readonly systemConfigModel: Model<SystemConfig>,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const document = await this.systemConfigModel.findOne({ key });
    return document ? (document.value as T) : null;
  }

  async getMany(keys: string[]): Promise<Record<string, unknown>> {
    const documents = await this.systemConfigModel.find({ key: { $in: keys } });
    return Object.fromEntries(documents.map((doc) => [doc.key, doc.value]));
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.systemConfigModel.findOneAndUpdate(
      { key },
      { value },
      { upsert: true },
    );
  }
}
