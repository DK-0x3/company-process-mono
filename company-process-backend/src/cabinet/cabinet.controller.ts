import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import * as currentUserInterface from '../auth/current-user.interface';
import { EmployeeOnlyGuard } from '../auth/employee-only.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubmitTestDto } from '../test/dto/submit-test.dto';
import {
  CabinetService,
  EmployeeCabinetResponse,
  EmployeeCabinetProcessDetailsResponse,
  EmployeeCabinetTaskDetailsResponse,
  EmployeeCabinetTestResultResponse,
} from './cabinet.service';

@ApiTags('cabinet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EmployeeOnlyGuard)
@Controller('cabinet')
export class CabinetController {
  constructor(private readonly cabinetService: CabinetService) {}

  @Get('me')
  @ApiOperation({ summary: 'Получить данные личного кабинета сотрудника' })
  @ApiResponse({ status: 200, description: 'Данные кабинета сотрудника' })
  getMe(
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ): Promise<EmployeeCabinetResponse> {
    return this.cabinetService.getEmployeeCabinet(user);
  }

  @Get('processes/:id')
  @ApiOperation({
    summary: 'Получить детальную информацию по назначенному процессу сотрудника',
  })
  processDetails(
    @Param('id', ParseIntPipe) processId: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ): Promise<EmployeeCabinetProcessDetailsResponse> {
    return this.cabinetService.getProcessDetailsForEmployee(processId, user);
  }

  @Get('tasks/:id')
  @ApiOperation({
    summary: 'Получить детальную информацию по назначенной задаче сотрудника',
  })
  taskDetails(
    @Param('id', ParseIntPipe) taskId: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ): Promise<EmployeeCabinetTaskDetailsResponse> {
    return this.cabinetService.getTaskDetailsForEmployee(taskId, user);
  }

  @Get('tests')
  @ApiOperation({ summary: 'Получить доступные сотруднику тесты' })
  getTests(@CurrentUser() user: currentUserInterface.CurrentUserData) {
    return this.cabinetService.getAvailableTestsForEmployee(user);
  }

  @Get('tests/:id')
  @ApiOperation({ summary: 'Получить тест сотрудника для прохождения' })
  getTestDetails(
    @Param('id', ParseIntPipe) testId: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.cabinetService.getTestDetailsForEmployee(testId, user);
  }

  @Get('tests/:id/result')
  @ApiOperation({ summary: 'Получить результат прохождения теста сотрудником' })
  getTestResult(
    @Param('id', ParseIntPipe) testId: number,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ): Promise<EmployeeCabinetTestResultResponse | null> {
    return this.cabinetService.getTestResultForEmployee(testId, user);
  }

  @Post('tests/:id/pass')
  @ApiOperation({ summary: 'Пройти тест сотруднику (доступно один раз)' })
  passTest(
    @Param('id', ParseIntPipe) testId: number,
    @Body() dto: SubmitTestDto,
    @CurrentUser() user: currentUserInterface.CurrentUserData,
  ) {
    return this.cabinetService.passTestForEmployee(testId, dto, user);
  }
}
