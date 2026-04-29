import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { TranscriptionInterface } from '../../transcription/interfaces/transcription.interface';
import { createFile } from 'src/common/helpers/helper-functions';

@Injectable()
export class LocalWhisperService implements TranscriptionInterface {
  private openAI: OpenAI;

  constructor() {
    this.openAI = new OpenAI({
      apiKey: 'local',
      baseURL: process.env.LOCAL_WHISPER_URL ?? 'http://localhost:9001/v1',
    });
  }

  async transcribe(file: Express.Multer.File): Promise<string> {
    const tempFilePath = path.join(
      __dirname,
      `../../../tmp/${Date.now()}-${file.originalname}`,
    );
    createFile(tempFilePath, file);

    try {
      const transcription = await this.openAI.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
      });

      return transcription.text;
    } finally {
      fs.unlinkSync(tempFilePath);
    }
  }
}
