import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class EmployeePermissionsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canViewProcesses?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canEditProcesses?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canViewTasks?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canEditTasks?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canViewPositions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canEditPositions?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canViewDataObjects?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canEditDataObjects?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canViewMaterials?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canEditMaterials?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canViewTests?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canEditTests?: boolean;
}
