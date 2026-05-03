import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TaskType } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Изменённое название задачи' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Новое описание задачи' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: TaskType,
    example: TaskType.decision,
    description: 'Тип задачи',
  })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiPropertyOptional({
    example: 3,
    description: 'ID ответственного сотрудника (legacy алиас)',
  })
  @IsOptional()
  @IsInt()
  employeeId?: number | null;

  @ApiPropertyOptional({
    example: 3,
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

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  processId?: number;

  @ApiPropertyOptional({
    example: [3, 8],
    description:
      'Полный список ID материалов задачи. Если передан, связи задачи с материалами заменяются.',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  materialIds?: number[];
}
