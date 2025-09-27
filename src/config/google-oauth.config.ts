import { registerAs } from '@nestjs/config';
export default registerAs('googleOAuth', () => ({
  clientID: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_ACCESS_SECRET || '',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '',
}));
