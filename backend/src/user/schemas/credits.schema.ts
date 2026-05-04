import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Credits {
  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: 0 })
  reserved: number;

  @Prop({ default: 0 })
  lifetime_used: number;
}

export const CreditsSchema = SchemaFactory.createForClass(Credits);