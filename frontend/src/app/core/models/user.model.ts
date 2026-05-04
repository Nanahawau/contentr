export interface Credits {
  balance: number;
  reserved: number;
  lifetime_used: number;
}

export interface User {
  id: string;
  email: string;
  verified: boolean;
  first_name?: string;
  last_name?: string;
  credits: Credits;
}