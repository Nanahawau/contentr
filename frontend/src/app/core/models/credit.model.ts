export enum CreditTransactionType {
  GRANT = 'grant',
  PURCHASE = 'purchase',
  RESERVE = 'reserve',
  CHARGE = 'charge',
  REFUND = 'refund',
}

export interface CreditTransaction {
  _id: string;
  user_id: string;
  type: CreditTransactionType;
  amount: number;
  upload_id?: string;
  description: string;
  createdAt: string;
}
