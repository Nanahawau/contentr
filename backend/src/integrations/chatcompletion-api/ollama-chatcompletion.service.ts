import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ContentInterface } from 'src/content/interfaces/content.interface';

@Injectable()
export class OllamaChatcompletionService implements ContentInterface {
  private openAI: OpenAI;

  constructor() {
    this.openAI = new OpenAI({
      apiKey: 'ollama',
      baseURL: process.env.LOCAL_OLLAMA_URL ?? 'http://localhost:11434/v1',
    });
  }

  async generate(prompt: string): Promise<string> {
    const response = await this.openAI.chat.completions.create({
      model: process.env.LOCAL_OLLAMA_MODEL ?? 'llama3',
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0].message.content ?? '';
  }
}
