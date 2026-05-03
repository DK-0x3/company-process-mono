import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import * as currentUserInterface from '../auth/current-user.interface';
import { WorkspacePermissionGuard } from '../auth/workspace-permission.guard';
import { RequireWorkspacePermission } from '../auth/workspace-permission.decorator';
import { CreateTaskDataDto } from './dto/create-task-data.dto';
import { TaskDataService } from './task-data.service';

@ApiTags('task-data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
@Controller('task-data')
export class TaskDataController {
  constructor(private readonly taskDataService: TaskDataService) {}

  private resolveWorkspaceUserId(user: currentUserInterface.CurrentUserData) {
    return user.ownerUserId;
  }

  @Post()
  @RequireWorkspacePermission('tasks', 'edit')
  @ApiOperation({ summary: 'Создать связь Task ↔ DataObject' })
  create(
    @Body() dto: CreateTaskDataDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.taskDataService.create(dto, this.resolveWorkspaceUserId(user));
  }

  @Get()
  @RequireWorkspacePermission('tasks', 'view')
  @ApiOperation({ summary: 'Получить связи TaskData пользователя' })
  findAll(
    @CurrentUser() user: currentUserInterface.CurrentUserData,
    @Query('taskId') taskId?: string,
  ) {
    let parsedTaskId: number | undefined;

    if (taskId !== undefined) {
      parsedTaskId = Number(taskId);
      if (!Number.isInteger(parsedTaskId)) {
        throw new BadRequestException('taskId должен быть целым числом');
      }
    }

    return this.taskDataService.findAll(
      this.resolveWorkspaceUserId(user),
      parsedTaskId,
    );
  }

  @Delete(':id')
  @RequireWorkspacePermission('tasks', 'edit')
  @ApiOperation({ summary: 'Удалить связь TaskData' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.taskDataService.remove(id, this.resolveWorkspaceUserId(user));
  }
}
