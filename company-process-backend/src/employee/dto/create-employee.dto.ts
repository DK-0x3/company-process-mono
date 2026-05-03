import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeePermissionsDto } from './employee-permissions.dto';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Иван Петров' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '1990-05-14' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: '2023-02-01' })
  @IsDateString()
  hireDate: string;

  @ApiProperty({ example: 'ivan.petrov@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+79990001122', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Москва, ул. Ленина, 12', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  positionId?: number;

  @ApiProperty({ example: 1, required: false, description: 'ID роли сотрудника' })
  @IsOptional()
  @IsInt()
  roleId?: number;

  @ApiProperty({
    example: 'employee.ivan',
    required: false,
    description: 'Логин для входа сотрудника в личный кабинет',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  accountLogin?: string;

  @ApiProperty({
    example: '123456',
    required: false,
    description: 'Пароль для входа сотрудника в личный кабинет',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  accountPassword?: string;

  @ApiProperty({ required: false, type: EmployeePermissionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeePermissionsDto)
  permissions?: EmployeePermissionsDto;
}
