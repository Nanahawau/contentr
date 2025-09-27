export type UploadJobData = {
  userId: string;
  file: Express.Multer.File;
  hashedFile: string;
};

export type UploadJobResponse = {
  userId: string;
  file: Express.Multer.File;
  uploadId: string;
};

export type TranscriptionJobResponse {
  text: string
}