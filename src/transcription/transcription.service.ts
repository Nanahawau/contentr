import { Injectable } from '@nestjs/common';
import { CreateTranscriptionDto } from './dto/create-transcription.dto';
import { UpdateTranscriptionDto } from './dto/update-transcription.dto';
import {Transcription} from "./interfaces/transcription";

@Injectable()
export class TranscriptionService implements Transcription {
  constructor() {
  }
  transcribe(file: File): void {
  }
}
