import { Platform } from '../enums/platform.enum';

export class CreateUploadDto {
  file: Express.Multer.File;
  platforms: Platform[];
  userId: string;
}
