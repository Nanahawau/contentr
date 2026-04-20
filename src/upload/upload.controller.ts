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
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';

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
            fileType: /(audio\/.*|video\/mp4)$/i,  // Accept all audio types + video/mp4
          }),
          new MaxFileSizeValidator({
            maxSize: 50 * 1024 * 1024, 
            message: 'File is too large, Max File size is 50MB',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body('platforms') platforms: string,
    @CurrentUser() user: {id: string, email: string},
  ) {
    return this.uploadService.create({ file, platforms: JSON.parse(platforms), user });
  }
}
