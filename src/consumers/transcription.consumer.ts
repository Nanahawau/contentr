import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model } from 'mongoose';
import { Transcription } from 'src/transcription/schemas/transcription.schema';
import { TranscriptionService } from 'src/transcription/transcription.service';
import { TranscriptionJobResponse, UploadJobResponse } from './consumers.type';

@Processor('transcriptionQueue')
export class TranscriptionConsumer extends WorkerHost {
  constructor(
    @InjectModel(Transcription.name)
    private transcriptionModel: Model<Transcription>,
    private transcriptionService: TranscriptionService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<TranscriptionJobResponse> {
    try {
      let transcription;
      if (job.parent && job.parent.id) {
        const parentQueue = new Queue(job.parent.queueKey);
        const parentJob = await parentQueue.getJob(job.parent.id);
        const parentJobResult =
          (await parentJob?.returnvalue) as UploadJobResponse;
        const { file, uploadId, userId } = parentJobResult;

        transcription = await this.transcriptionModel.findOne({
          upload_id: uploadId,
          user_id: userId,
        });

        if (!transcription) {
          const transcribedText =
            await this.transcriptionService.transcribe(file);
          transcription = await this.transcriptionModel.create({
            upload_id: uploadId,
            user_id: userId,
            text: transcribedText,
          });
        }
      }

      return { text: transcription.text };
    } catch (error) {
      throw new Error('An error occurred in transcription queue');
    }
  }
}
