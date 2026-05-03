import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProcessDto {
  @ApiPropertyOptional({ example: 'Новое название процесса' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Новое описание' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Повысить конверсию согласования' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'ID родительского процесса (алиас parentId)',
  })
  @IsOptional()
  @IsInt()
  parentProcessId?: number;

  @ApiPropertyOptional({
    example: 4,
    description: 'ID нового ответственного сотрудника (legacy алиас)',
  })
  @IsOptional()
  @IsInt()
  employeeId?: number | null;

  @ApiPropertyOptional({
    example: 4,
    description: 'ID нового ответственного сотрудника',
  })
  @IsOptional()
  @IsInt()
  responsibleEmployeeId?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID ответственной должности',
  })
  @IsOptional()
  @IsInt()
  responsiblePositionId?: number | null;

  @ApiPropertyOptional({
    example: 2,
    description: 'ID ответственной роли',
  })
  @IsOptional()
  @IsInt()
  responsibleRoleId?: number | null;

  @ApiPropertyOptional({
    example: 2,
    description: 'Версия процесса',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Активность процесса',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: [2, 4],
    description:
      'Полный список ID материалов процесса. Если передан, связи процесса с материалами заменяются.',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  materialIds?: number[];
}
