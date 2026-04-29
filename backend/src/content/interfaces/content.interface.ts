export interface ContentInterface {
  generate(prompt: string): Promise<string>;
}
