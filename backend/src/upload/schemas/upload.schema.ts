import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Platform } from 'src/common/enums/platform.enum';
import { UploadStatus } from '../enums/upload-status.enum';

export type UploadDocument = HydratedDocument<Upload>;

@Schema({ _id: false })
class UploadMetadata {
  @Prop({ default: 0 })
  duration_seconds: number;

  @Prop({ default: 0 })
  word_count: number;
}

@Schema({ timestamps: true })
export class Upload {
  @Prop({ required: true, index: true })
  user_id: string;

  @Prop({ required: true })
  original_name: string;

  @Prop({ required: true, index: true })
  s3Key: string;

  @Prop({ required: true, index: true })
  hash: string;

  @Prop({ required: true })
  mime_type: string;

  @Prop({ required: true })
  file_size: number;

  @Prop({ type: [String], enum: Platform, required: true })
  platforms: Platform[];

  @Prop({ type: String, enum: UploadStatus, default: UploadStatus.PENDING })
  status: UploadStatus;

  @Prop({ required: true })
  quality_score: number;

  @Prop({ type: UploadMetadata, default: () => ({}) })
  metadata: UploadMetadata;

  @Prop({ default: 0 })
  credits_reserved: number;
}

export const UploadSchema = SchemaFactory.createForClass(Upload);
