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
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import * as currentUserInterface from '../auth/current-user.interface';
import { OwnerOnlyGuard } from '../auth/owner-only.guard';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OwnerOnlyGuard)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @ApiOperation({ summary: 'Создать сотрудника' })
  @ApiResponse({ status: 201, description: 'Сотрудник создан' })
  create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.employeeService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Получить всех сотрудников пользователя' })
  findAll(@CurrentUser() user: currentUserInterface.CurrentUserData) {
    return this.employeeService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить сотрудника по ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.employeeService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить данные сотрудника' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.employeeService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить сотрудника' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.employeeService.remove(id, user.id);
  }
}
