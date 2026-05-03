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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import * as currentUserInterface from '../auth/current-user.interface';
import { WorkspacePermissionGuard } from '../auth/workspace-permission.guard';
import { RequireWorkspacePermission } from '../auth/workspace-permission.decorator';
import { CreateDataObjectDto } from './dto/create-data-object.dto';
import { UpdateDataObjectDto } from './dto/update-data-object.dto';
import { DataObjectService } from './data-object.service';

@ApiTags('data-objects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
@Controller('data-objects')
export class DataObjectController {
  constructor(private readonly dataObjectService: DataObjectService) {}

  private resolveWorkspaceUserId(user: currentUserInterface.CurrentUserData) {
    return user.ownerUserId;
  }

  @Post()
  @RequireWorkspacePermission('dataObjects', 'edit')
  @ApiOperation({ summary: 'Создать объект данных' })
  create(
    @Body() dto: CreateDataObjectDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.dataObjectService.create(dto, this.resolveWorkspaceUserId(user));
  }

  @Get()
  @RequireWorkspacePermission('dataObjects', 'view')
  @ApiOperation({ summary: 'Получить объекты данных пользователя' })
  findAll(@CurrentUser() user: currentUserInterface.CurrentUserData) {
    return this.dataObjectService.findAll(this.resolveWorkspaceUserId(user));
  }

  @Get(':id')
  @RequireWorkspacePermission('dataObjects', 'view')
  @ApiOperation({ summary: 'Получить объект данных по ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.dataObjectService.findOne(id, this.resolveWorkspaceUserId(user));
  }

  @Put(':id')
  @RequireWorkspacePermission('dataObjects', 'edit')
  @ApiOperation({ summary: 'Обновить объект данных' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDataObjectDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.dataObjectService.update(id, dto, this.resolveWorkspaceUserId(user));
  }

  @Delete(':id')
  @RequireWorkspacePermission('dataObjects', 'edit')
  @ApiOperation({ summary: 'Удалить объект данных' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.dataObjectService.remove(id, this.resolveWorkspaceUserId(user));
  }
}
