import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateProcessPdfDto {
  @ApiPropertyOptional({
    description:
      'Название компании в заголовке PDF. По умолчанию: ООО "СтартСет"',
    example: 'ООО "СтартСет"',
  })
  @IsOptional()
  @IsString()
  companyName?: string;
}
