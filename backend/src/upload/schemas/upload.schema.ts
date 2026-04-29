import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UploadDocument = HydratedDocument<Upload>;

@Schema()
export class Upload {
  @Prop({ required: true, index: true })
  s3Key: string;
  @Prop({ required: true, index: true })
  hash: string;
  @Prop({ required: true, index: true })
  user_id: string;
  @Prop({ required: true, index: true })
  original_name: string;

}

export const UploadSchema = SchemaFactory.createForClass(Upload);
