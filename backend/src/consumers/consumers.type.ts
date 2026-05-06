export type TranscriptionJobData = {
  userId: string;
  uploadId: string;
};

export type UploadJobResponse = {
  userId: string;
  file: Express.Multer.File;
  uploadId: string;
};

export type TranscriptionJobResponse = {
  text: string,
  userId: string,
  uploadId: string,
}

import { Platform } from 'src/upload/enums/platform.enum';

export type LlmJobData = {
  platforms: Platform[];
  userId: string;
  uploadId: string;
};