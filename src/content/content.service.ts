import { Inject, Injectable } from '@nestjs/common';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentInterface } from './interfaces/content.interface';

@Injectable()
export class ContentService implements ContentInterface {
  constructor(
    @Inject('CONTENT_PROVIDER')
    private readonly provider: ContentInterface,
  ) {}

  async generate(prompt: string) {
    return this.provider.generate(prompt);
  }

  findAll() {
    return `This action returns all content`;
  }

  findOne(id: number) {
    return `This action returns a #${id} content`;
  }

  update(id: number, updateContentDto: UpdateContentDto) {
    return `This action updates a #${id} content`;
  }

  remove(id: number) {
    return `This action removes a #${id} content`;
  }
}
