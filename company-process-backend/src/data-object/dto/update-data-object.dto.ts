import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDataObjectDto {
  @ApiPropertyOptional({ example: 'Решение по заявке' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Выходной документ процесса' })
  @IsOptional()
  @IsString()
  description?: string;
}
