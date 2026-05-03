import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePositionDto {
  @ApiProperty({ example: 'Разработчик' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
