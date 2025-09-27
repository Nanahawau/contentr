import { Inject, Injectable } from '@nestjs/common';
import { TranscriptionInterface } from './interfaces/transcription.interface';

@Injectable()
export class TranscriptionService {
  constructor(
    @Inject('TRANSCRIPTION_PROVIDER')
    private readonly provider: TranscriptionInterface,
  ) {}

  /**
   * Transcribe file to text.
   * @param file
   */
  async transcribe(file: Express.Multer.File) {}
}
