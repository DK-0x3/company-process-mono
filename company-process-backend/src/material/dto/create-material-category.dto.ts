import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMaterialCategoryDto {
  @ApiProperty({ example: 'Онбординг' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Материалы по адаптации и обучению' })
  @IsOptional()
  @IsString()
  description?: string;
}
