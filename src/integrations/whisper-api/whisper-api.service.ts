import { Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import defaultConfig from '../../config/default.config';
import { OpenAI } from 'openai';
import { TranscriptionInterface } from '../../transcription/interfaces/transcription.interface';

@Injectable()
export class WhisperApiService implements TranscriptionInterface {
  private openAI: OpenAI;
  constructor(private configService: ConfigType<typeof defaultConfig>) {
    this.openAI = new OpenAI({
      apiKey: configService.openAIKey,
    });
  }

  /**
   * Transcribes audio/video into text using whisper AI.
   * @param file
   * @return string
   */
  async transcribe(file: File): Promise<string> {
    const transcription = await this.openAI.audio.transcriptions.create({
      file,
      model: this.configService.openAITranscriptionModel,
    });

    return transcription.text;
  }
}
