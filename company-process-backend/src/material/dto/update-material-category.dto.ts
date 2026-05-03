import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateMaterialCategoryDto {
  @ApiPropertyOptional({ example: 'Регламенты' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Внутренние регламенты и стандарты' })
  @IsOptional()
  @IsString()
  description?: string;
}
