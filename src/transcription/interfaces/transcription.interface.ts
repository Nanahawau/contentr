export interface TranscriptionInterface {
  transcribe(file: File): Promise<string>;
}
