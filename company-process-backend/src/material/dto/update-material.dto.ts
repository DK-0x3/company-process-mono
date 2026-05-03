import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateMaterialDto {
  @ApiPropertyOptional({ example: 'Обновленная инструкция по code review' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: '# Новая версия\n\nОбновлённые правила выполнения задачи.',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 4],
    description:
      'Полный список связанных процессов. Если передан, связи будут заменены',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  processIds?: number[];

  @ApiPropertyOptional({
    type: [Number],
    example: [3, 9],
    description:
      'Полный список связанных задач. Если передан, связи будут заменены',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  taskIds?: number[];
}
