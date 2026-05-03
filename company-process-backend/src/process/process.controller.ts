import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import {
  ProcessDescriptionResponse,
  ProcessPassportResponse,
  ProcessService,
} from './process.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { GenerateProcessPdfDto } from './dto/generate-process-pdf.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import * as currentUserInterface from '../auth/current-user.interface';
import { WorkspacePermissionGuard } from '../auth/workspace-permission.guard';
import { RequireWorkspacePermission } from '../auth/workspace-permission.decorator';
import type { Response } from 'express';

@ApiTags('processes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
@Controller('processes')
export class ProcessController {
  constructor(private readonly processService: ProcessService) {}

  private resolveWorkspaceUserId(user: currentUserInterface.CurrentUserData) {
    return user.ownerUserId;
  }

  @Post()
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({
    summary: 'Создать процесс (можно указать ответственного сотрудника)',
  })
  create(
    @Body() dto: CreateProcessDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.processService.create(dto, this.resolveWorkspaceUserId(user));
  }

  @Get('flat')
  @RequireWorkspacePermission('processes', 'view')
  @ApiOperation({ summary: 'Получить все процессы (плоский список)' })
  findAllFlat(@CurrentUser() user: currentUserInterface.CurrentUserData) {
    return this.processService.findAllFlat(this.resolveWorkspaceUserId(user));
  }

  @Get('tree')
  @RequireWorkspacePermission('processes', 'view')
  @ApiOperation({ summary: 'Получить дерево процессов пользователя' })
  findAllTree(@CurrentUser() user: currentUserInterface.CurrentUserData) {
    return this.processService.findAllTree(this.resolveWorkspaceUserId(user));
  }

  @Get(':id')
  @RequireWorkspacePermission('processes', 'view')
  @ApiOperation({ summary: 'Получить процесс по ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.processService.findOne(id, this.resolveWorkspaceUserId(user));
  }

  @Put(':id')
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({
    summary: 'Обновить процесс',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcessDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.processService.update(
      id,
      dto,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Delete(':id')
  @RequireWorkspacePermission('processes', 'edit')
  @ApiOperation({ summary: 'Удалить процесс' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.processService.remove(id, this.resolveWorkspaceUserId(user));
  }

  @Get(':id/subtree')
  @RequireWorkspacePermission('processes', 'view')
  @ApiOperation({
    summary:
      'Получить дерево подпроцессов данного процесса (вложенные рекурсивно)',
  })
  findSubtree(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.processService.findSubtree(
      id,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Get(':id/subtree/flat')
  @RequireWorkspacePermission('processes', 'view')
  @ApiOperation({
    summary: 'Получить все подпроцессы данного процесса (список без дерева)',
  })
  findSubprocessesFlat(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.processService.findSubprocessesAndTasksFlat(
      id,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Get(':id/validate')
  @RequireWorkspacePermission('processes', 'view')
  @ApiOperation({ summary: 'Проверить корректность схемы процесса' })
  validate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.processService.validateProcess(
      id,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Get(':id/description')
  @RequireWorkspacePermission('processes', 'view')
  @ApiOperation({ summary: 'Сгенерировать текстовое описание процесса' })
  generateDescription(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ): Promise<ProcessDescriptionResponse> {
    return this.processService.generateProcessDescription(
      id,
      this.resolveWorkspaceUserId(user),
    );
  }

  @Post(':id/pdf')
  @RequireWorkspacePermission('processes', 'view')
  @ApiOperation({ summary: 'Сгенерировать PDF-документацию процесса' })
  @ApiProduces('application/pdf')
  @ApiBody({ type: GenerateProcessPdfDto, required: false })
  @ApiOkResponse({
    description: 'PDF-файл с документацией процесса',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  async generatePdf(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerateProcessPdfDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const pdf = await this.processService.generateProcessPdf(
      id,
      this.resolveWorkspaceUserId(user),
      dto,
    );

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${pdf.fileName}"; filename*=UTF-8''${encodeURIComponent(pdf.fileName)}`,
    );

    return new StreamableFile(pdf.buffer);
  }

  @Get(':id/passport')
  @RequireWorkspacePermission('processes', 'view')
  @ApiOperation({ summary: 'Сгенерировать паспорт процесса' })
  generatePassport(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ): Promise<ProcessPassportResponse> {
    return this.processService.generateProcessPassport(
      id,
      this.resolveWorkspaceUserId(user),
    );
  }
}
