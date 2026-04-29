import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export function generateFileHash(data: Express.Multer.File): string {
  const hash = createHash('sha256');
  hash.update(data.buffer);

  return hash.digest('hex');
}

export function getQueueName(key: string): string {
  return key.split(':')[1];
}

function generateBase64String(length = 32): string {
  return randomBytes(length).toString('base64');
}

export function generateS3Key(userEmail: string, fileName: string): string {
  return `${userEmail}/${fileName ?? generateBase64String()}`.trim();
}

export function createFile(tempFilePath: string, file: Express.Multer.File) {
  const tempDir = path.dirname(tempFilePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  fs.writeFileSync(tempFilePath, file.buffer);
}
