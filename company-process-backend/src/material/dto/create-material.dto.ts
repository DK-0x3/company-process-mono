import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMaterialDto {
  @ApiProperty({ example: 'Как выполнять code review' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example:
      '# Инструкция\n\n1. Открыть MR\n2. Проверить архитектуру\n3. Дать комментарии',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2, 5],
    description: 'ID процессов, к которым привязывается материал',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  processIds?: number[];

  @ApiPropertyOptional({
    type: [Number],
    example: [3, 7],
    description: 'ID задач, к которым привязывается материал',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  taskIds?: number[];
}
