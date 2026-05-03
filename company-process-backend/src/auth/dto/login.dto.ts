import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Логин пользователя' })
  @IsString()
  login: string;

  @ApiProperty({ example: 'qwerty123', description: 'Пароль' })
  @IsString()
  password: string;
}
