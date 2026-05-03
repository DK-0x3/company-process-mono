import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TestQuestionDto } from './test-question.dto';

export class CreateTestDto {
  @ApiProperty({ example: 'Тест по процессу разработки' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Проверка понимания этапов и ролей процесса' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 30, description: 'Время на выполнение теста в минутах' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeLimitMinutes: number;

  @ApiProperty({ type: [TestQuestionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TestQuestionDto)
  questions: TestQuestionDto[];

  @ApiPropertyOptional({ type: [Number], example: [1, 2] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  employeeIds?: number[];

  @ApiPropertyOptional({ type: [Number], example: [3] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  positionIds?: number[];

  @ApiPropertyOptional({ type: [Number], example: [4] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  processIds?: number[];

  @ApiPropertyOptional({ type: [Number], example: [10, 11] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  taskIds?: number[];
}
