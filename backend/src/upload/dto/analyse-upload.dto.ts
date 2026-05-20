import { Transform } from 'class-transformer';
import { IsArray, IsEnum } from 'class-validator';
import { Platform } from 'src/common/enums/platform.enum';

export class AnalyseUploadDto {
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Platform[];
      } catch {
        return [value];
      }
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms: Platform[];
}
