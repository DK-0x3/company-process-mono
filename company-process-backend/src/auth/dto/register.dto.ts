import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'admin', description: 'Логин пользователя' })
  @IsString()
  login: string;

  @ApiProperty({ example: 'admin@mail.com', description: 'Электронная почта' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'qwerty123', description: 'Пароль' })
  @IsString()
  @MinLength(6)
  password: string;
}
