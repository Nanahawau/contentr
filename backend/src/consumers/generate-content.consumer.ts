import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LlmJobData, TranscriptionJobResponse } from './consumers.type';
import { ContentService } from 'src/content/content.service';
import { Content } from 'src/content/schemas/content.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { QueueName } from 'src/common/constants/queue.constants';
import { Platform } from 'src/common/enums/platform.enum';

type GenerateContentResult = { success: boolean; platformsProcessed: number };

const platformPrompts: Record<Platform, (transcript: string) => string> = {
  [Platform.TWITTER]: (transcript) =>
    `Summarize the following transcript in a tweet (max 280 characters). Make it engaging and include relevant hashtags.\nTranscript:\n${transcript}`,
  [Platform.LINKEDIN]: (transcript) =>
    `Write a professional LinkedIn post based on the following transcript. Focus on insights and actionable advice.\nTranscript:\n${transcript}`,
  [Platform.INSTAGRAM]: (transcript) =>
    `Create a catchy Instagram caption with emojis and a call to action. Make it friendly and visual.\nTranscript:\n${transcript}`,
  [Platform.TIKTOK]: (transcript) =>
    `Suggest a short, creative video script for TikTok based on the following transcript. Highlight the main idea in a fun way.\nTranscript:\n${transcript}`,
  [Platform.YOUTUBE_SHORTS]: (transcript) =>
    `Write a punchy YouTube Shorts script (under 60 seconds) based on the following transcript. Hook the viewer in the first 3 seconds.\nTranscript:\n${transcript}`,
};

@Processor(QueueName.GENERATE_CONTENT)
export class GenerateContentQueue extends WorkerHost {
  private readonly logger = new Logger(GenerateContentQueue.name);

  constructor(
    private readonly contentService: ContentService,
    @InjectModel(Content.name) private readonly contentModel: Model<Content>,
  ) {
    super();
  }

  async process(
    job: Job<LlmJobData, GenerateContentResult>,
  ): Promise<GenerateContentResult> {
    this.logger.log({
      message: 'generate-content consumer started',
      queueName: job.queueName,
      jobId: job.id,
    });

    const childrenValues = await job.getChildrenValues();
    const transcriptionResult = Object.values(
      childrenValues,
    )[0] as TranscriptionJobResponse;

    if (!transcriptionResult) {
      throw new Error('Transcription result not found from child job');
    }

    const { text, userId, uploadId } = transcriptionResult;
    const { platforms } = job.data;

    await Promise.all(
      platforms.map(async (platform) => {
        const prompt = platformPrompts[platform](text);
        const generatedContent = await this.contentService.generate(prompt);

        await this.contentModel.create({
          user_id: userId,
          platform,
          content: generatedContent,
          upload_id: uploadId,
        });

        this.logger.log({ message: 'Content generated', platform, uploadId });
      }),
    );

    return { success: true, platformsProcessed: platforms.length };
  }
}
