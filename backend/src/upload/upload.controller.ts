import {
  Body,
  Controller,
  Get,
  HttpStatus,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UploadService } from './upload.service';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { VerifiedGuard } from 'src/common/guard/verified.guard';
import { AnalyseUploadDto } from './dto/analyse-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

type AuthenticatedUser = { id: string; email: string; verified: boolean };

const fileValidationPipe = new ParseFilePipe({
  validators: [
    new FileTypeValidator({
      fileType: /(audio\/.*|video\/mp4|text\/.*|application\/pdf)$/i,
    }),
  ],
  fileIsRequired: true,
});

@Controller('uploads')
@UseGuards(VerifiedGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('analyse')
  @UseInterceptors(FileInterceptor('file'))
  async analyse(
    @UploadedFile(fileValidationPipe) file: Express.Multer.File,
    @Body() analyseDto: AnalyseUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.uploadService.analyse(file, user.id, analyseDto.platforms);
  }

  @Post('confirm')
  async confirm(
    @Body() confirmDto: ConfirmUploadDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { upload, isDuplicate } = await this.uploadService.confirm(
      confirmDto.analysisToken,
      user.id,
    );
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
