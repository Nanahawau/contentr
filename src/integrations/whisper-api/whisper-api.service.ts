import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import defaultConfig from '../../config/default.config';
import OpenAI from "openai";
import * as fs from 'fs';
import * as path from 'path';
import { TranscriptionInterface } from '../../transcription/interfaces/transcription.interface';
import { createFile } from 'src/common/helpers/helper-functions';

@Injectable()
export class WhisperApiService implements TranscriptionInterface {
  private openAI: OpenAI;
  constructor(
    @Inject(defaultConfig.KEY)
    private configService: ConfigType<typeof defaultConfig>,
  ) {
    this.openAI = new OpenAI({
      apiKey: configService.openAIKey,
    });
  }

  /**
   * Transcribes audio/video into text using whisper AI.
   * @param file
   * @return string
   */
  async transcribe(file: Express.Multer.File): Promise<string> {
    // Write buffer to a temporary file
    const tempFilePath = path.join(
      __dirname,
      `../../../tmp/${Date.now()}-${file.originalname}`,
    );
    createFile(tempFilePath, file)

    try {
      const transcription = await this.openAI.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: this.configService.openAITranscriptionModel,
      });

      return transcription.text;
    } finally {
      // Delete the temporary file
      fs.unlinkSync(tempFilePath);
    }
  }
}
