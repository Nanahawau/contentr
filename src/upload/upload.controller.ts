import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType: '/\\.(mp3|mp4|mpeg|mpga|m4a|wav|webm)$/i',
          }),
          new MaxFileSizeValidator({
            maxSize: 1000000,
            message: 'File is too large, Max File size is 20MB',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() platforms: string[]
  ) {
    return this.uploadService.create({ file, platforms });
  }
}
