import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContentDocument = HydratedDocument<Content>;

@Schema()
export class Content {
  @Prop({ required: true, index: true })
  platform: string;
  @Prop({ required: true, index: true })
  user_id: string;
  @Prop({ required: true, index: true })
  content: string;
  @Prop({ required: true, index: true })
  upload_id: string;
}

export const ContentSchema = SchemaFactory.createForClass(Content);
