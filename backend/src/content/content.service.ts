import { Inject, Injectable } from '@nestjs/common';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentInterface } from './interfaces/content.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Content } from './schemas/content.schema';

@Injectable()
export class ContentService implements ContentInterface {
  constructor(
    @Inject('CONTENT_PROVIDER')
    private readonly provider: ContentInterface,
    @InjectModel(Content.name) private contentModel: Model<Content>,
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
}
