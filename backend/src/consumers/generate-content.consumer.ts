import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LlmJobData, TranscriptionJobResponse } from './consumers.type';
import { ContentService } from 'src/content/content.service';
import { Content } from 'src/content/schemas/content.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';

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

@Processor('generateContentQueue')
export class GenerateContentQueue extends WorkerHost {
  private readonly logger = new Logger(GenerateContentQueue.name);
  
  constructor(
    private readonly contentService: ContentService,
    @InjectModel(Content.name) private contentModel: Model<Content>,
  ) {
    super();
  }

 async process(job: Job<LlmJobData, any, string>): Promise<any> {
  try {
    this.logger.log({ 
      message: 'generate-content consumer has started running',  
      queueName: job.queueName,
      jobId: job.id 
    });

    // Get the result from child jobs
    const childrenValues = await job.getChildrenValues();
    
    this.logger.log({ 
      message: 'Children values retrieved',
      childrenValues 
    });

    // Get the first (and only) child value
    const transcriptionResult = Object.values(childrenValues)[0] as TranscriptionJobResponse;

    if (!transcriptionResult) {
      throw new Error('Transcription result not found from child job');
    }

    const { text, userId, uploadId } = transcriptionResult;
    const platforms = job.data.platforms;

    this.logger.log({ 
      message: 'Processing platforms',
      platforms,
      transcriptLength: text?.length,
      transcriptionData: { userId, uploadId }
    });

    // Generate content for each platform
    for (const platform of platforms) {
      const promptFn = platformPrompts[platform];

      if (!promptFn) {
        this.logger.warn({ message: `No prompt function for platform: ${platform}` });
        continue;
      }

      const prompt = promptFn(text);
      const generatedContent = await this.contentService.generate(prompt);

      this.logger.log({ 
        message: 'Content generated',
        platform,
        contentLength: generatedContent?.length 
      });

      await this.contentModel.create({
        user_id: userId,
        platform,
        content: generatedContent,
        upload_id: uploadId,
      });
    }

    this.logger.log({ message: 'All content generated successfully' });
    
    return { success: true, platformsProcessed: platforms.length };

  } catch (error) {
    this.logger.error({ 
      message: 'Error in generate-content queue',
      error: error?.message, 
      stack: error?.stack 
    });
    throw error;
  }
}
}