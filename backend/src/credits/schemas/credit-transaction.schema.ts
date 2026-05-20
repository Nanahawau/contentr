import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CreditTransactionDocument = HydratedDocument<CreditTransaction>;

export enum CreditTransactionType {
  GRANT = 'grant',
  PURCHASE = 'purchase',
  RESERVE = 'reserve',
  CHARGE = 'charge',
  REFUND = 'refund',
}

@Schema({ timestamps: true })
export class CreditTransaction {
  @Prop({ required: true, index: true })
  user_id: string;

  @Prop({ type: String, enum: CreditTransactionType, required: true })
  type: CreditTransactionType;

  @Prop({ required: true })
  amount: number;

  @Prop({ index: true })
  upload_id?: string;

  @Prop({ required: true })
  description: string;
}

export const CreditTransactionSchema =
  SchemaFactory.createForClass(CreditTransaction);