import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { LlmJobData, TranscriptionJobResponse } from './consumers.type';
import { ContentService } from 'src/content/content.service';
import { Content } from 'src/content/schemas/content.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { use } from 'passport';

export const platformPrompts = {
  twitter: (transcript: string) =>
    `Summarize the following transcript in a tweet (max 280 characters). Make it engaging and include relevant hashtags.\nTranscript:\n${transcript}`,

  linkedin: (transcript: string) =>
    `Write a professional LinkedIn post based on the following transcript. Focus on insights and actionable advice.\nTranscript:\n${transcript}`,

  instagram: (transcript: string) =>
    `Create a catchy Instagram caption with emojis and a call to action. Make it friendly and visual.\nTranscript:\n${transcript}`,

  tiktok: (transcript: string) =>
    `Suggest a short, creative video script for TikTok based on the following transcript. Highlight the main idea in a fun way.\nTranscript:\n${transcript}`,
};

@Processor('llmQueue')
export class LLMConsumer extends WorkerHost {
  constructor(
    private readonly contentService: ContentService,
    @InjectModel(Content.name) private contentModel: Model<Content>,
  ) {
    super();
  }
  async process(job: Job<LlmJobData, any, string>): Promise<any> {
    try {
      if (job.parent && job.parent.id) {
        const parentQueue = new Queue(job.parent.queueKey);
        const parentJob = await parentQueue.getJob(job.parent.id);
        const parentJobResult =
          (await parentJob?.returnvalue) as TranscriptionJobResponse;
        const platforms = job.data.platforms;
        const { text, userId, uploadId } = parentJobResult;

        for (const platform of platforms) {
          const promptFn = platformPrompts[platform];

          if (!promptFn) continue;

          const prompt = promptFn(text);
          const generatedContent = await this.contentService.generate(prompt);

          await this.contentModel.create({
            user_id: userId,
            platform,
            content: generatedContent,
            upload_id: uploadId,
          });
        }
      }
    } catch (error) {
      throw new Error('An error occurred in llm queue');
    }
  }
}
