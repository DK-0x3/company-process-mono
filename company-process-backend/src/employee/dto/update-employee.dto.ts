import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeePermissionsDto } from './employee-permissions.dto';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'Петров Иван Иванович' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '1991-03-11' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ example: 'ivan.petr@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+79991234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Москва, ул. Арбат, 25' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  positionId?: number | null;

  @ApiPropertyOptional({ example: 1, description: 'ID роли сотрудника' })
  @IsOptional()
  @IsInt()
  roleId?: number | null;

  @ApiPropertyOptional({
    example: 'employee.ivan',
    description: 'Логин сотрудника для личного кабинета',
  })
  @IsOptional()
  @IsString()
  accountLogin?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'Новый пароль сотрудника для личного кабинета',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  accountPassword?: string;

  @ApiPropertyOptional({ type: EmployeePermissionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeePermissionsDto)
  permissions?: EmployeePermissionsDto;
}
