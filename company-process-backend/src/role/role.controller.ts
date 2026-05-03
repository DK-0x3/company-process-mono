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
import { OwnerOnlyGuard } from '../auth/owner-only.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleService } from './role.service';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OwnerOnlyGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: 'Создать роль' })
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.roleService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Получить роли пользователя' })
  findAll(@CurrentUser() user: currentUserInterface.CurrentUserData) {
    return this.roleService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить роль по ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.roleService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить роль' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.roleService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить роль' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.roleService.remove(id, user.id);
  }
}
