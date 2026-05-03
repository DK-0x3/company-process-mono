import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TestQuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TestQuestionOptionDto } from './test-question-option.dto';

export class TestQuestionDto {
  @ApiProperty({ enum: TestQuestionType, example: TestQuestionType.single_choice })
  @IsEnum(TestQuestionType)
  type: TestQuestionType;

  @ApiProperty({ example: 'Какая роль отвечает за итоговый результат процесса?' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Можно использовать markdown для выделения ключевых слов' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Порядок вопроса в тесте' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: 'Введите развернутый ответ...' })
  @IsOptional()
  @IsString()
  textAnswerPlaceholder?: string;

  @ApiPropertyOptional({
    example: 'Ответ должен содержать этап валидации и назначение ответственного',
    description: 'Опционально: эталон ответа для текстового вопроса',
  })
  @IsOptional()
  @IsString()
  expectedTextAnswer?: string;

  @ApiPropertyOptional({ type: [TestQuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestQuestionOptionDto)
  options?: TestQuestionOptionDto[];
}
