import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProcessDto {
  @ApiProperty({ example: 'Разработка нового продукта' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Описание процесса' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Сократить срок обработки заявки до 2 дней' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID родительского процесса (алиас parentId)',
  })
  @IsOptional()
  @IsInt()
  parentProcessId?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'ID ответственного сотрудника (legacy алиас)',
  })
  @IsOptional()
  @IsInt()
  employeeId?: number | null;

  @ApiPropertyOptional({
    example: 2,
    description: 'ID ответственного сотрудника',
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
    example: 1,
    description: 'ID ответственной роли',
  })
  @IsOptional()
  @IsInt()
  responsibleRoleId?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Версия процесса (по умолчанию 1)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Активность процесса',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: [1, 3, 7],
    description: 'ID материалов, связанных с процессом',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  materialIds?: number[];
}
