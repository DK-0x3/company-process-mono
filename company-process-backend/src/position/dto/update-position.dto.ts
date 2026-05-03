import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePositionDto {
  @ApiPropertyOptional({ example: 'Старший разработчик' })
  @IsOptional()
  @IsString()
  name?: string;
}
