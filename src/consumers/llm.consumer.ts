import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { TranscriptionJobResponse } from './consumers.type';

@Processor('llmQueue')
export class LLMConsumer extends WorkerHost {
  constructor() {
    super();
  }
  async process(job: Job<any, any, string>): Promise<any> {
    try {
      if (job.parent && job.parent.id) {
        const parentQueue = new Queue(job.parent.queueKey);
        const parentJob = await parentQueue.getJob(job.parent.id);
        const parentJobResult =
          (await parentJob?.returnvalue) as TranscriptionJobResponse;
      }
    } catch (error) {
      throw new Error('An error occurred in llm queue');
    }
  }
}
