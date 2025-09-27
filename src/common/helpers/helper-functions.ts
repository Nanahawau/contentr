import { createHash } from 'crypto';
export function generateFileHash(data: Express.Multer.File): string {
  const hash = createHash('sha256');
  hash.update(data.buffer);

  return hash.digest('hex');
}
