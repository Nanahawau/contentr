export class CreateUploadDto {
  file: Express.Multer.File;
  platforms: string[]
  user: User
}

type User = {
  id: string;
  email: string;
}