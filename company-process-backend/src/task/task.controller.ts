import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import * as currentUserInterface from '../auth/current-user.interface';
import { WorkspacePermissionGuard } from '../auth/workspace-permission.guard';
import { RequireWorkspacePermission } from '../auth/workspace-permission.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  private resolveWorkspaceUserId(user: currentUserInterface.CurrentUserData) {
    return user.ownerUserId;
  }

  @Post()
  @RequireWorkspacePermission('tasks', 'edit')
  @ApiOperation({ summary: 'Создать задачу для процесса' })
  @ApiResponse({ status: 201, description: 'Задача успешно создана' })
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.taskService.create(dto, this.resolveWorkspaceUserId(user));
  }

  @Get()
  @RequireWorkspacePermission('tasks', 'view')
  @ApiOperation({ summary: 'Получить все задачи пользователя' })
  @ApiResponse({ status: 200, description: 'Список задач' })
  findAll(@CurrentUser() user: currentUserInterface.CurrentUserData) {
    return this.taskService.findAll(this.resolveWorkspaceUserId(user));
  }

  @Get(':id')
  @RequireWorkspacePermission('tasks', 'view')
  @ApiOperation({ summary: 'Получить задачу по ID' })
  @ApiResponse({ status: 200, description: 'Задача найдена' })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.taskService.findOne(id, this.resolveWorkspaceUserId(user));
  }

  @Put(':id')
  @RequireWorkspacePermission('tasks', 'edit')
  @ApiOperation({ summary: 'Обновить задачу' })
  @ApiResponse({ status: 200, description: 'Задача обновлена' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.taskService.update(id, dto, this.resolveWorkspaceUserId(user));
  }

  @Delete(':id')
  @RequireWorkspacePermission('tasks', 'edit')
  @ApiOperation({ summary: 'Удалить задачу' })
  @ApiResponse({ status: 200, description: 'Задача удалена' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.taskService.remove(id, this.resolveWorkspaceUserId(user));
  }

  @Get(':id/passport')
  @RequireWorkspacePermission('tasks', 'view')
  @ApiOperation({ summary: 'Сгенерировать паспорт задачи' })
  @ApiResponse({ status: 200, description: 'Паспорт задачи сформирован' })
  passport(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.taskService.generateTaskPassport(
      id,
      this.resolveWorkspaceUserId(user),
    );
  }
}
