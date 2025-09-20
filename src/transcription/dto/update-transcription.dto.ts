import { PartialType } from '@nestjs/swagger';
import { CreateTranscriptionDto } from './create-transcription.dto';

export class UpdateTranscriptionDto extends PartialType(CreateTranscriptionDto) {}
