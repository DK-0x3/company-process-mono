import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsNumber,
  IsEnum,
  IsObject,
  IsNotEmpty,
  ValidateNested,
  IsDefined,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DotSide, ComponentType } from '@prisma/client';

export class BaseComponentDto {
  @ApiProperty({ example: 100, description: 'Координата X на холсте' })
  @IsNumber()
  @IsNotEmpty()
  x: number;

  @ApiProperty({ example: 100, description: 'Координата Y на холсте' })
  @IsNumber()
  @IsNotEmpty()
  y: number;

  @ApiProperty({ example: 200, description: 'Ширина блока' })
  @IsNumber()
  @IsNotEmpty()
  width: number;

  @ApiProperty({ example: 80, description: 'Высота блока' })
  @IsNumber()
  @IsNotEmpty()
  height: number;
}

export class CreateProcessComponentDto extends BaseComponentDto {
  @ApiProperty({ description: 'ID процесса из основной таблицы данных' })
  @IsNumber()
  @IsNotEmpty()
  processId: number;
}

export class CreateTaskComponentDto extends BaseComponentDto {
  @ApiProperty({ description: 'ID задачи из основной таблицы данных' })
  @IsNumber()
  @IsNotEmpty()
  taskId: number;
}

// DTO для обновления (используется при изменении размеров или перемещении)
export class UpdateComponentDto extends PartialType(BaseComponentDto) {}

export class ArrowDotDto {
  @ApiProperty({ enum: DotSide, description: 'Сторона привязки точки' })
  @IsEnum(DotSide)
  side: DotSide;

  @ApiProperty({
    example: 0.5,
    description: 'Смещение точки вдоль стороны (от 0 до 1)',
  })
  @IsNumber()
  offset: number;

  @ApiProperty({
    description:
      'ID визуального компонента (ProcessComponent или TaskComponent)',
  })
  @IsNumber()
  @IsNotEmpty()
  parentComponentId: number;

  @ApiProperty({
    enum: ComponentType,
    description: 'Тип родительского компонента',
  })
  @IsEnum(ComponentType)
  parentComponentType: ComponentType;
}

export class CreateArrowDto {
  @ApiProperty({ type: ArrowDotDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ArrowDotDto) // Важно для class-transformer
  fromDot: ArrowDotDto;

  @ApiProperty({ type: ArrowDotDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ArrowDotDto)
  toDot: ArrowDotDto;
}

export class BatchUpdateComponentDto {
  @ApiProperty({ description: 'ID компонента' })
  @IsNumber()
  id: number;

  @ApiProperty({ enum: ComponentType })
  @IsEnum(ComponentType)
  type: ComponentType;

  @ApiProperty()
  @IsNumber()
  x: number;

  @ApiProperty()
  @IsNumber()
  y: number;
}

export class BatchUpdatePositionsDto {
  @ApiProperty({ type: [BatchUpdateComponentDto] })
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateComponentDto)
  components: BatchUpdateComponentDto[];
}

export class CreateFullSchemeDto {
  @ApiProperty({
    type: [CreateProcessComponentDto],
    description: 'Список компонентов процессов',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProcessComponentDto)
  processes: CreateProcessComponentDto[];

  @ApiProperty({
    type: [CreateTaskComponentDto],
    description: 'Список компонентов задач',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskComponentDto)
  tasks: CreateTaskComponentDto[];

  @ApiProperty({
    type: [CreateArrowDto],
    description:
      'Список стрелок. Важно: parentComponentId здесь должен указывать на processId или taskId, так как компоненты еще не созданы.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateArrowDto)
  arrows: CreateArrowDto[];
}
