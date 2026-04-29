import { registerAs } from '@nestjs/config';
export default registerAs('awsConfig', () => ({
  region: process.env.REGION || '',
  bucket: process.env.BUCKET_NAME || '',
  accessKeyID: process.env.AWS_ACCESS_KEY_ID || '',
  secretKeyID: process.env.AWS_SECRET_KEY_ID || '',
  endpoint: process.env.AWS_ENDPOINT || undefined,
}));
