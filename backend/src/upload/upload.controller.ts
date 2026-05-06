import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  FileTypeValidator,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigType } from '@nestjs/config';
import { UploadService } from './upload.service';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { VerifiedGuard } from 'src/common/guard/verified.guard';
import { Platform } from './enums/platform.enum';
import defaultConfig from 'src/config/default.config';

type AuthenticatedUser = { id: string; email: string; verified: boolean };

@Controller('uploads')
@UseGuards(VerifiedGuard)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    @Inject(defaultConfig.KEY) private readonly config: ConfigType<typeof defaultConfig>,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType: /(audio\/.*|video\/mp4|text\/.*|application\/pdf)$/i,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body('platforms') platformsJson: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const maxBytes = this.config.maxUploadSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `File too large. Maximum size is ${this.config.maxUploadSizeMb}MB.`,
      );
    }

    const platforms = JSON.parse(platformsJson) as Platform[];
    const { upload, isDuplicate } = await this.uploadService.create({ file, platforms, userId: user.id });

    response.status(isDuplicate ? HttpStatus.OK : HttpStatus.CREATED);
    return upload;
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
