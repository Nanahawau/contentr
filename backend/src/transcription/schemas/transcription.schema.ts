import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type TranscriptionDocument = HydratedDocument<Transcription>;

@Schema()
export class Transcription {
  @Prop({ type: String, required: true })
  text: string;

  @Prop({ type: String, required: true })
  user_id: string;

  @Prop({ type: String, required: true })
  upload_id: string;

  @Prop({ default: 'whisper', required: true })
  provider: string;
}
export const TranscriptionSchema = SchemaFactory.createForClass(Transcription);
