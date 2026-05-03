import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { SubmitTestAnswerDto } from './submit-test-answer.dto';

export class SubmitTestDto {
  @ApiProperty({ type: [SubmitTestAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitTestAnswerDto)
  answers: SubmitTestAnswerDto[];

  @ApiPropertyOptional({
    example: 742,
    description: 'Фактическая длительность прохождения в секундах',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}
