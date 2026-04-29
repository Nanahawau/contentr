import { registerAs } from '@nestjs/config';
export default registerAs('jwtConfig', () => ({
  secret: process.env.JWT_SECRET || '',
  jwtExpiry: process.env.JWT_EXPIRY || '3hr',
}));
