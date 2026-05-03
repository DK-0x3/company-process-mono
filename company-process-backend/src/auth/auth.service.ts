import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ login: dto.login }, { email: dto.email }],
      },
    });
    if (existing) throw new BadRequestException('User already exists');

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        login: dto.login,
        email: dto.email,
        password: hash,
      },
    });

    return {
      message: 'User registered successfully',
      user: {
        id: user.id,
        login: user.login,
        email: user.email,
        actorType: 'OWNER' as const,
        ownerUserId: user.id,
        employeeId: null,
      },
      token: await this.generateToken({
        sub: user.id,
        login: user.login,
        actorType: 'OWNER',
        ownerUserId: user.id,
      }),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });
    if (!user) throw new UnauthorizedException('Invalid login or password');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid login or password');

    const authPayload = await this.buildAuthPayloadByUserId(user.id);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        login: user.login,
        email: user.email,
        actorType: authPayload.actorType,
        ownerUserId: authPayload.ownerUserId,
        employeeId: authPayload.employeeId ?? null,
      },
      token: await this.generateToken(authPayload),
    };
  }

  async loginEmployee(dto: EmployeeLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
      include: {
        employeeProfile: {
          select: {
            id: true,
            userId: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!user || user.actorType !== 'EMPLOYEE') {
      throw new UnauthorizedException('Аккаунт сотрудника не найден');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    if (!user.ownerUserId || !user.employeeProfileId || !user.employeeProfile) {
      throw new UnauthorizedException('Аккаунт сотрудника настроен некорректно');
    }

    if (user.employeeProfile.userId !== user.ownerUserId) {
      throw new UnauthorizedException('Аккаунт сотрудника не привязан к владельцу');
    }

    const authPayload = await this.buildAuthPayloadByUserId(user.id);

    return {
      message: 'Employee login successful',
      user: {
        id: user.id,
        login: user.login,
        email: user.email,
        actorType: authPayload.actorType,
        ownerUserId: authPayload.ownerUserId,
        employeeId: authPayload.employeeId ?? null,
        fullName: user.employeeProfile.fullName,
      },
      token: await this.generateToken(authPayload),
    };
  }

  private async buildAuthPayloadByUserId(userId: number): Promise<{
    sub: number;
    login: string;
    actorType: 'OWNER' | 'EMPLOYEE';
    ownerUserId: number;
    employeeId?: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        login: true,
        actorType: true,
        ownerUserId: true,
        employeeProfileId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (user.actorType === 'EMPLOYEE') {
      if (!user.ownerUserId || !user.employeeProfileId) {
        throw new UnauthorizedException('Аккаунт сотрудника настроен некорректно');
      }

      return {
        sub: user.id,
        login: user.login,
        actorType: 'EMPLOYEE',
        ownerUserId: user.ownerUserId,
        employeeId: user.employeeProfileId,
      };
    }

    return {
      sub: user.id,
      login: user.login,
      actorType: 'OWNER',
      ownerUserId: user.id,
    };
  }

  private async generateToken(payload: {
    sub: number;
    login: string;
    actorType: 'OWNER' | 'EMPLOYEE';
    ownerUserId: number;
    employeeId?: number;
  }) {
    return this.jwtService.signAsync(payload);
  }
}
