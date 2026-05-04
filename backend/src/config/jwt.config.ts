import { registerAs } from '@nestjs/config';

export default registerAs('jwtConfig', () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET is not set');
  if (!process.env.JWT_EMAIL_VERIFICATION_SECRET) throw new Error('JWT_EMAIL_VERIFICATION_SECRET is not set');

  return {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    emailVerificationSecret: process.env.JWT_EMAIL_VERIFICATION_SECRET,
    accessTokenExpiry: process.env.JWT_EXPIRY || '1h',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    emailVerificationExpiry: '30m',
  };
});
