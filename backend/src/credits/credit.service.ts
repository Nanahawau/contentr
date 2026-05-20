import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigType } from '@nestjs/config';
import {
  CreditTransaction,
  CreditTransactionType,
} from './schemas/credit-transaction.schema';
import { SystemConfigService } from '../system-config/system-config.service';
import { User } from '../user/schemas/user.schema';
import { Platform } from 'src/common/enums/platform.enum';
import defaultConfig from '../config/default.config';

export type CreditEstimate = {
  transcriptionCost: number;
  storageCost: number;
  generationCost: number;
  total: number;
};

const SCRIPT_PLATFORMS = new Set<Platform>([
  Platform.TIKTOK,
  Platform.YOUTUBE_SHORTS,
]);

const SYSTEM_CONFIG_RATE_KEYS = [
  'transcription_cost_per_minute',
  'storage_cost_per_100mb',
  'text_cost_per_1k_words',
  'caption_generation_tiers',
  'script_generation_tiers',
] as const;

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(
    @InjectModel(CreditTransaction.name)
    private readonly creditTransactionModel: Model<CreditTransaction>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly systemConfigService: SystemConfigService,
    @Inject(defaultConfig.KEY)
    private readonly config: ConfigType<typeof defaultConfig>,
  ) {}

  async estimateCost(
    durationSeconds: number,
    wordCount: number,
    fileSizeMb: number,
    platforms: Platform[],
  ): Promise<CreditEstimate> {
    const rates = this.config.creditRates;
    const overrides = await this.systemConfigService.getMany([
      ...SYSTEM_CONFIG_RATE_KEYS,
    ]);

    const transcriptionPerMinute =
      (overrides['transcription_cost_per_minute'] as number | undefined) ??
      rates.transcriptionPerMinute;

    const storagePerHundredMb =
      (overrides['storage_cost_per_100mb'] as number | undefined) ??
      rates.storagePerHundredMb;

    const textPer1kWords =
      (overrides['text_cost_per_1k_words'] as number | undefined) ??
      rates.textPer1kWords;

    const captionTiers =
      (overrides['caption_generation_tiers'] as
        | [number, number, number, number]
        | undefined) ?? rates.captionGenerationTiers;

    const scriptTiers =
      (overrides['script_generation_tiers'] as
        | [number, number, number, number]
        | undefined) ?? rates.scriptGenerationTiers;

    const transcriptionCost =
      durationSeconds > 0
        ? Math.ceil(durationSeconds / 60) * transcriptionPerMinute
        : Math.ceil(wordCount / 1000) * textPer1kWords;

    const storageCost = Math.ceil(fileSizeMb / 100) * storagePerHundredMb;

    const tierIndex = this.getGenerationTierIndex(durationSeconds, wordCount);
    const generationCost = platforms.reduce((sum, platform) => {
      const tiers = SCRIPT_PLATFORMS.has(platform) ? scriptTiers : captionTiers;
      return sum + tiers[tierIndex];
    }, 0);

    const total = transcriptionCost + storageCost + generationCost;
    return { transcriptionCost, storageCost, generationCost, total };
  }

  async reserve(
    userId: string,
    uploadId: string,
    amount: number,
  ): Promise<void> {
    const result = await this.userModel.findOneAndUpdate(
      { _id: userId, 'credits.balance': { $gte: amount } },
      { $inc: { 'credits.balance': -amount, 'credits.reserved': amount } },
    );

    if (!result) {
      const user = await this.userModel.findById(userId).select('credits');
      throw new HttpException(
        {
          message: 'Insufficient credits.',
          balance: user?.credits.balance ?? 0,
          required: amount,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    await this.creditTransactionModel.create({
      user_id: userId,
      upload_id: uploadId,
      type: CreditTransactionType.RESERVE,
      amount,
      description: `Reserved ${amount} credits for upload.`,
    });
  }

  async release(
    userId: string,
    uploadId: string,
    amount: number,
  ): Promise<void> {
    try {
      await this.userModel.findByIdAndUpdate(userId, {
        $inc: { 'credits.balance': amount, 'credits.reserved': -amount },
      });
      await this.creditTransactionModel.create({
        user_id: userId,
        upload_id: uploadId,
        type: CreditTransactionType.REFUND,
        amount,
        description: `Released ${amount} reserved credits.`,
      });
    } catch (error) {
      this.logger.error('Failed to release reserved credits', {
        userId,
        uploadId,
        amount,
        error,
      });
      throw error;
    }
  }

  async charge(
    userId: string,
    uploadId: string,
    amount: number,
  ): Promise<void> {
    try {
      await this.userModel.findByIdAndUpdate(userId, {
        $inc: { 'credits.reserved': -amount, 'credits.lifetime_used': amount },
      });
      await this.creditTransactionModel.create({
        user_id: userId,
        upload_id: uploadId,
        type: CreditTransactionType.CHARGE,
        amount: -amount,
        description: `Charged ${amount} credits for completed job.`,
      });
    } catch (error) {
      this.logger.error('Failed to charge credits', {
        userId,
        uploadId,
        amount,
        error,
      });
      throw error;
    }
  }

  async findHistory(userId: string): Promise<CreditTransaction[]> {
    return this.creditTransactionModel
      .find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  private getGenerationTierIndex(
    durationSeconds: number,
    wordCount: number,
  ): number {
    if (durationSeconds > 0) {
      const minutes = durationSeconds / 60;
      if (minutes <= 5) return 0;
      if (minutes <= 30) return 1;
      if (minutes <= 60) return 2;
      return 3;
    }
    if (wordCount <= 750) return 0;
    if (wordCount <= 4500) return 1;
    if (wordCount <= 9000) return 2;
    return 3;
  }
}
