import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import defaultConfig from 'src/config/default.config';
import { ContentInterface } from 'src/content/interfaces/content.interface';

@Injectable()
export class ChatcompletionApiService implements ContentInterface {
  private openAI: OpenAI;
  constructor(
    @Inject(defaultConfig.KEY)
    private configService: ConfigType<typeof defaultConfig>,
  ) {
    this.openAI = new OpenAI({
      apiKey: this.configService.openAIKey,
    });
  }
  async generate(prompt: string): Promise<string> {
    const response = await this.openAI.responses.create({
      model: this.configService.openAIContentGenerationModel,
      input: prompt,
    });

    return response.output_text;
  }
}
