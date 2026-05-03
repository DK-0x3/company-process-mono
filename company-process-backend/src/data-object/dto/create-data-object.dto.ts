import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDataObjectDto {
  @ApiProperty({ example: 'Заявка клиента' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Исходный документ, поступающий в процесс' })
  @IsOptional()
  @IsString()
  description?: string;
}
