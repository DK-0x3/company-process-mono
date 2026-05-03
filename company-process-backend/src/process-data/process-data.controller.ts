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
import { CreateProcessDataDto } from './dto/create-process-data.dto';
import { ProcessDataService } from './process-data.service';

@ApiTags('process-data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
@Controller('process-data')
export class ProcessDataController {
  constructor(private readonly processDataService: ProcessDataService) {}

  private resolveWorkspaceUserId(user: currentUserInterface.CurrentUserData) {
    return user.ownerUserId;
  }

  @Post()
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({ summary: 'Создать связь Process ↔ DataObject' })
  create(
    @Body() dto: CreateProcessDataDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.processDataService.create(dto, this.resolveWorkspaceUserId(user));
  }

  @Get()
  @RequireWorkspacePermission('processes', 'view')
  @ApiOperation({ summary: 'Получить связи ProcessData пользователя' })
  findAll(
    @CurrentUser() user: currentUserInterface.CurrentUserData,
    @Query('processId') processId?: string,
  ) {
    let parsedProcessId: number | undefined;

    if (processId !== undefined) {
      parsedProcessId = Number(processId);
      if (!Number.isInteger(parsedProcessId)) {
        throw new BadRequestException('processId должен быть целым числом');
      }
    }

    return this.processDataService.findAll(this.resolveWorkspaceUserId(user), parsedProcessId);
  }

  @Delete(':id')
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({ summary: 'Удалить связь ProcessData' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.processDataService.remove(id, this.resolveWorkspaceUserId(user));
  }
}
