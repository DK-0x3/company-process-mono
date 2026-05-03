import { ApiProperty } from '@nestjs/swagger';
import { DataFlowType } from '@prisma/client';
import { IsEnum, IsInt } from 'class-validator';

export class CreateProcessDataDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  processId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  dataObjectId: number;

  @ApiProperty({ enum: DataFlowType, example: DataFlowType.input })
  @IsEnum(DataFlowType)
  type: DataFlowType;
}
