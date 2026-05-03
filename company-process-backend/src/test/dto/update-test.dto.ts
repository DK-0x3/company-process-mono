import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TestQuestionDto } from './test-question.dto';

export class UpdateTestDto {
  @ApiPropertyOptional({ example: 'Обновленный тест по процессу разработки' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Актуализированная версия теста' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @ApiPropertyOptional({
    type: [TestQuestionDto],
    description: 'Полный список вопросов. Если передан — вопросы теста будут полностью заменены.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TestQuestionDto)
  questions?: TestQuestionDto[];

  @ApiPropertyOptional({
    type: [Number],
    description: 'Полный список сотрудников для привязки. Если передан — связи будут заменены.',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  employeeIds?: number[];

  @ApiPropertyOptional({
    type: [Number],
    description: 'Полный список должностей для привязки. Если передан — связи будут заменены.',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  positionIds?: number[];

  @ApiPropertyOptional({
    type: [Number],
    description: 'Полный список процессов для привязки. Если передан — связи будут заменены.',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  processIds?: number[];

  @ApiPropertyOptional({
    type: [Number],
    description: 'Полный список задач для привязки. Если передан — связи будут заменены.',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  taskIds?: number[];
}
