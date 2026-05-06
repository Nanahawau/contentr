import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { VerifiedGuard } from 'src/common/guard/verified.guard';
import { Platform } from './enums/platform.enum';

type AuthenticatedUser = { id: string; email: string; verified: boolean };

@Controller('uploads')
@UseGuards(VerifiedGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType: /(audio\/.*|video\/mp4|text\/.*|application\/pdf)$/i,
          }),
          new MaxFileSizeValidator({
            maxSize: 100 * 1024 * 1024,
            message: 'File too large. Maximum size is 100MB.',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body('platforms') platformsJson: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const platforms = JSON.parse(platformsJson) as Platform[];
    return this.uploadService.create({ file, platforms, userId: user.id });
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.uploadService.findAll(user.id, limit, cursor);
  }

  @Get(':id')
  async findOne(
    @Param('id') uploadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.uploadService.findOne(uploadId, user.id);
  }
}
