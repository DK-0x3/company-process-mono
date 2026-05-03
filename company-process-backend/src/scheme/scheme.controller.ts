import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SchemeService } from './scheme.service';
import { ComponentType } from '@prisma/client';
import {
  CreateProcessComponentDto,
  CreateTaskComponentDto,
  CreateArrowDto,
  BatchUpdatePositionsDto,
  UpdateComponentDto,
  CreateFullSchemeDto,
} from './dto/scheme.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import * as currentUserInterface from '../auth/current-user.interface';
import { WorkspacePermissionGuard } from '../auth/workspace-permission.guard';
import { RequireWorkspacePermission } from '../auth/workspace-permission.decorator';

@ApiTags('Scheme Editor (Редактор схем)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
@Controller('scheme/:ownerProcessId')
export class SchemeController {
  constructor(private readonly schemeService: SchemeService) {}

  private resolveWorkspaceUserId(user: currentUserInterface.CurrentUserData) {
    return user.ownerUserId;
  }

  @Get()
  @RequireWorkspacePermission('processes', 'view')
  @ApiOperation({ summary: 'Загрузить всю схему процесса-владельца' })
  @ApiParam({
    name: 'ownerProcessId',
    description: 'ID процесса, чью схему мы смотрим',
  })
  async getScheme(
    @Param('ownerProcessId', ParseIntPipe) ownerId: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.schemeService.getSchemeByProcess(
      ownerId,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Post('process')
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({ summary: 'Добавить существующий процесс на холст' })
  async addProcess(
    @Param('ownerProcessId', ParseIntPipe) ownerId: number,
    @Body() dto: CreateProcessComponentDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.schemeService.addProcessToScheme(
      ownerId,
      dto,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Post('task')
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({ summary: 'Добавить задачу на холст' })
  async addTask(
    @Param('ownerProcessId', ParseIntPipe) ownerId: number,
    @Body() dto: CreateTaskComponentDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.schemeService.addTaskToScheme(
      ownerId,
      dto,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Post('arrow')
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({ summary: 'Создать связь (стрелку) между компонентами' })
  async addArrow(
    @Param('ownerProcessId', ParseIntPipe) ownerId: number,
    @Body() dto: CreateArrowDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.schemeService.addArrowToScheme(
      ownerId,
      dto,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Delete('arrow/connection')
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({
    summary: 'Удалить стрелку по точкам соединения',
    description:
      'Удаляет связь между двумя точками. Требует точного совпадения сторон, оффсетов и ID компонентов.',
  })
  async deleteArrowConnection(
    @Param('ownerProcessId', ParseIntPipe) ownerId: number,
    @Body() dto: CreateArrowDto, // Используем тот же DTO, что и при создании
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.schemeService.deleteArrowByDots(
      ownerId,
      dto,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Patch('batch-positions')
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({
    summary: 'Массовое обновление позиций (drag-and-drop нескольких элементов)',
  })
  async batchUpdate(
    @Param('ownerProcessId', ParseIntPipe) ownerId: number,
    @Body() dto: BatchUpdatePositionsDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.schemeService.batchUpdatePositions(
      ownerId,
      dto,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Patch(':type/:id')
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({
    summary: 'Изменить параметры отдельного компонента (размер, положение)',
  })
  async updateComponent(
    @Param('ownerProcessId', ParseIntPipe) ownerId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('type') type: ComponentType,
    @Body() dto: UpdateComponentDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.schemeService.updateComponent(
      ownerId,
      id,
      type,
      dto,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Delete(':id')
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({ summary: 'Удалить компонент со схемы' })
  @ApiQuery({ name: 'type', enum: ComponentType })
  async deleteComponent(
    @Param('ownerProcessId', ParseIntPipe) ownerId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('type') type: ComponentType,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.schemeService.deleteComponent(
      ownerId,
      id,
      type,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Post('full')
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({
    summary: 'Создать/Перезаписать полную схему',
    description:
      'Принимает массив всех компонентов и стрелок. ВАЖНО: Для стрелок в поле parentComponentId нужно передавать processId или taskId, так как ID компонентов создаются в процессе.',
  })
  async createFullScheme(
    @Param('ownerProcessId', ParseIntPipe) ownerId: number,
    @Body() dto: CreateFullSchemeDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.schemeService.createFullScheme(
      ownerId,
      dto,
      this.resolveWorkspaceUserId(user),
    );
  }
}
