import { ApiProperty } from '@nestjs/swagger';
import { DataFlowType } from '@prisma/client';
import { IsEnum, IsInt } from 'class-validator';

export class CreateTaskDataDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  taskId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  dataObjectId: number;

  @ApiProperty({ enum: DataFlowType, example: DataFlowType.output })
  @IsEnum(DataFlowType)
  type: DataFlowType;
}
