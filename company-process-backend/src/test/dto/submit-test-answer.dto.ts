import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class SubmitTestAnswerDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  questionId: number;

  @ApiPropertyOptional({ type: [Number], example: [2] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  selectedOptionIds?: number[];

  @ApiPropertyOptional({ example: 'Текстовый ответ сотрудника' })
  @IsOptional()
  @IsString()
  textAnswer?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  usedHint?: boolean;
}
