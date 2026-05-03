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
import { CreateMaterialCategoryDto } from './dto/create-material-category.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialCategoryDto } from './dto/update-material-category.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialService } from './material.service';

@ApiTags('materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
@Controller('materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  private resolveWorkspaceUserId(user: currentUserInterface.CurrentUserData) {
    return user.ownerUserId;
  }

  @Post('categories')
  @RequireWorkspacePermission('materials', 'edit')
  @ApiOperation({ summary: 'Создать категорию материала' })
  createCategory(
    @Body() dto: CreateMaterialCategoryDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.materialService.createCategory(dto, this.resolveWorkspaceUserId(user));
  }

  @Get('categories')
  @RequireWorkspacePermission('materials', 'view')
  @ApiOperation({ summary: 'Получить категории материалов пользователя' })
  findAllCategories(@CurrentUser() user: currentUserInterface.CurrentUserData) {
    return this.materialService.findAllCategories(this.resolveWorkspaceUserId(user));
  }

  @Put('categories/:id')
  @RequireWorkspacePermission('materials', 'edit')
  @ApiOperation({ summary: 'Обновить категорию материала' })
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialCategoryDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.materialService.updateCategory(
      id,
      dto,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Delete('categories/:id')
  @RequireWorkspacePermission('materials', 'edit')
  @ApiOperation({ summary: 'Удалить категорию материала' })
  removeCategory(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.materialService.removeCategory(id, this.resolveWorkspaceUserId(user));
  }

  @Post()
  @RequireWorkspacePermission('materials', 'edit')
  @ApiOperation({ summary: 'Создать материал' })
  create(
    @Body() dto: CreateMaterialDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.materialService.create(dto, this.resolveWorkspaceUserId(user));
  }

  @Get()
  @RequireWorkspacePermission('materials', 'view')
  @ApiOperation({ summary: 'Получить материалы пользователя' })
  findAll(@CurrentUser() user: currentUserInterface.CurrentUserData) {
    return this.materialService.findAll(this.resolveWorkspaceUserId(user));
  }

  @Get(':id')
  @RequireWorkspacePermission('materials', 'view')
  @ApiOperation({ summary: 'Получить материал по ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.materialService.findOne(id, this.resolveWorkspaceUserId(user));
  }

  @Put(':id')
  @RequireWorkspacePermission('materials', 'edit')
  @ApiOperation({ summary: 'Обновить материал' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.materialService.update(id, dto, this.resolveWorkspaceUserId(user));
  }

  @Delete(':id')
  @RequireWorkspacePermission('materials', 'edit')
  @ApiOperation({ summary: 'Удалить материал' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.materialService.remove(id, this.resolveWorkspaceUserId(user));
  }
}
