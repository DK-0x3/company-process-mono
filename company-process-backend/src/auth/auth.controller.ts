import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as userDecorator from './user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно зарегистрирован',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Авторизация пользователя' })
  @ApiResponse({ status: 200, description: 'Успешный вход' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('employee-login')
  @ApiOperation({ summary: 'Авторизация сотрудника (личный кабинет)' })
  @ApiResponse({ status: 200, description: 'Успешный вход сотрудника' })
  loginEmployee(@Body() dto: EmployeeLoginDto) {
    return this.authService.loginEmployee(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@userDecorator.User() user: userDecorator.JwtUser) {
    return user;
  }
}
