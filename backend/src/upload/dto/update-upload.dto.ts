import { PartialType } from '@nestjs/swagger';
import { ConfirmUploadDto } from './confirm-upload.dto';

export class UpdateUploadDto extends PartialType(ConfirmUploadDto) {}
