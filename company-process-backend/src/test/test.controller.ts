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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import * as currentUserInterface from '../auth/current-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/workspace-permission.guard';
import { RequireWorkspacePermission } from '../auth/workspace-permission.decorator';
import { CreateTestDto } from './dto/create-test.dto';
import { SubmitTestDto } from './dto/submit-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { TestService } from './test.service';

@ApiTags('tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
@Controller('tests')
export class TestController {
  constructor(private readonly testService: TestService) {}

  private resolveWorkspaceUserId(user: currentUserInterface.CurrentUserData) {
    return user.ownerUserId;
  }

  @Post()
  @RequireWorkspacePermission('tests', 'edit')
  @ApiOperation({ summary: 'Создать тест' })
  create(
    @Body() dto: CreateTestDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.testService.create(dto, this.resolveWorkspaceUserId(user));
  }

  @Get()
  @RequireWorkspacePermission('tests', 'view')
  @ApiOperation({ summary: 'Получить список тестов пользователя' })
  findAll(@CurrentUser() user: currentUserInterface.CurrentUserData) {
    return this.testService.findAll(this.resolveWorkspaceUserId(user));
  }

  @Get(':id')
  @RequireWorkspacePermission('tests', 'view')
  @ApiOperation({ summary: 'Получить тест по ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.testService.findOne(id, this.resolveWorkspaceUserId(user));
  }

  @Get(':id/stats')
  @RequireWorkspacePermission('tests', 'view')
  @ApiOperation({ summary: 'Получить подробную статистику по тесту' })
  findStats(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.testService.findStats(id, this.resolveWorkspaceUserId(user));
  }

  @Get(':id/my-result')
  @RequireWorkspacePermission('tests', 'view')
  @ApiOperation({ summary: 'Получить последний результат прохождения теста текущим пользователем' })
  findMyResult(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.testService.findMyResult(id, this.resolveWorkspaceUserId(user));
  }

  @Post(':id/pass')
  @RequireWorkspacePermission('tests', 'view')
  @ApiOperation({ summary: 'Пройти тест и сохранить последний результат' })
  pass(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitTestDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.testService.passTest(id, dto, this.resolveWorkspaceUserId(user));
  }

  @Put(':id')
  @RequireWorkspacePermission('tests', 'edit')
  @ApiOperation({ summary: 'Обновить тест' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTestDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.testService.update(id, dto, this.resolveWorkspaceUserId(user));
  }

  @Delete(':id')
  @RequireWorkspacePermission('tests', 'edit')
  @ApiOperation({ summary: 'Удалить тест' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.testService.remove(id, this.resolveWorkspaceUserId(user));
  }
}
