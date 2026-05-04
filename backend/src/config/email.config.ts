import { registerAs } from '@nestjs/config';

export default registerAs('emailConfig', () => ({
  provider: process.env.EMAIL_PROVIDER || 'mailpit',
  mailpitHost: process.env.MAILPIT_HOST || 'mailpit',
  mailpitPort: parseInt(process.env.MAILPIT_PORT || '') || 1025,
  resendApiKey: process.env.RESEND_API_KEY || '',
  fromAddress: process.env.EMAIL_FROM || 'noreply@contentr.app',
  appUrl: process.env.APP_URL || 'http://localhost:4200',
}));