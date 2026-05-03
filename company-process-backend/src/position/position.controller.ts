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
import { PositionService } from './position.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import * as currentUserInterface from '../auth/current-user.interface';
import { WorkspacePermissionGuard } from '../auth/workspace-permission.guard';
import { RequireWorkspacePermission } from '../auth/workspace-permission.decorator';

@ApiTags('positions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
@Controller('positions')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  private resolveWorkspaceUserId(user: currentUserInterface.CurrentUserData) {
    return user.ownerUserId;
  }

  @Post()
  @RequireWorkspacePermission('positions', 'edit')
  @ApiOperation({ summary: 'Создать должность' })
  create(
    @Body() dto: CreatePositionDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.positionService.create(dto, this.resolveWorkspaceUserId(user));
  }

  @Get()
  @RequireWorkspacePermission('positions', 'view')
  @ApiOperation({ summary: 'Получить все должности пользователя' })
  findAll(@CurrentUser() user: currentUserInterface.CurrentUserData) {
    return this.positionService.findAll(this.resolveWorkspaceUserId(user));
  }

  @Get(':id')
  @RequireWorkspacePermission('positions', 'view')
  @ApiOperation({ summary: 'Получить должность по ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.positionService.findOne(id, this.resolveWorkspaceUserId(user));
  }

  @Put(':id')
  @RequireWorkspacePermission('positions', 'edit')
  @ApiOperation({ summary: 'Обновить должность' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePositionDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.positionService.update(id, dto, this.resolveWorkspaceUserId(user));
  }

  @Delete(':id')
  @RequireWorkspacePermission('positions', 'edit')
  @ApiOperation({ summary: 'Удалить должность' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.positionService.remove(id, this.resolveWorkspaceUserId(user));
  }
}
