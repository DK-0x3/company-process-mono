import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class EmployeeLoginDto {
  @ApiProperty({ example: 'employee.ivan' })
  @IsString()
  login: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password: string;
}
