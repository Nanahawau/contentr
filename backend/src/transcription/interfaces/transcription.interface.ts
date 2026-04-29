export interface TranscriptionInterface {
  transcribe(file: Express.Multer.File): Promise<string>;
}
