import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TaskType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Настроить базу данных' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Создать схему таблиц в PostgreSQL', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: TaskType,
    example: TaskType.task,
    required: false,
    description: 'Тип задачи',
  })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiProperty({ example: 1 })
  @IsInt()
  processId: number;

  @ApiProperty({
    example: 2,
    required: false,
    description: 'ID сотрудника, ответственного за задачу (legacy алиас)',
  })
  @IsOptional()
  @IsInt()
  employeeId?: number | null;

  @ApiProperty({
    example: 2,
    required: false,
    description: 'ID ответственного сотрудника',
  })
  @IsOptional()
  @IsInt()
  responsibleEmployeeId?: number | null;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'ID ответственной должности',
  })
  @IsOptional()
  @IsInt()
  responsiblePositionId?: number | null;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'ID ответственной роли',
  })
  @IsOptional()
  @IsInt()
  responsibleRoleId?: number | null;

  @ApiProperty({
    example: [1, 5],
    required: false,
    description: 'ID материалов, связанных с задачей',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  materialIds?: number[];
}
