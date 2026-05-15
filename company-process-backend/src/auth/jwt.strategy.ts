import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';
import { getJwtSecret } from './jwt.config';

interface JwtPayload {
  sub: number;
  login: string;
  actorType?: 'OWNER' | 'EMPLOYEE';
  ownerUserId?: number;
  employeeId?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        login: true,
        email: true,
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
        throw new UnauthorizedException(
          'Аккаунт сотрудника настроен некорректно',
        );
      }

      const employee = await this.prisma.employee.findUnique({
        where: { id: user.employeeProfileId },
        select: {
          id: true,
          userId: true,
          email: true,
          canViewProcesses: true,
          canEditProcesses: true,
          canViewTasks: true,
          canEditTasks: true,
          canViewPositions: true,
          canEditPositions: true,
          canViewDataObjects: true,
          canEditDataObjects: true,
          canViewMaterials: true,
          canEditMaterials: true,
          canViewTests: true,
          canEditTests: true,
        },
      });

      if (!employee || employee.userId !== user.ownerUserId) {
        throw new UnauthorizedException(
          'Сотрудник не найден или не принадлежит владельцу',
        );
      }

      return {
        id: user.id,
        login: user.login,
        email: user.email,
        actorType: 'EMPLOYEE' as const,
        ownerUserId: user.ownerUserId,
        employeeId: employee.id,
        permissions: {
          canViewProcesses: employee.canViewProcesses,
          canEditProcesses: employee.canEditProcesses,
          canViewTasks: employee.canViewTasks,
          canEditTasks: employee.canEditTasks,
          canViewPositions: employee.canViewPositions,
          canEditPositions: employee.canEditPositions,
          canViewDataObjects: employee.canViewDataObjects,
          canEditDataObjects: employee.canEditDataObjects,
          canViewMaterials: employee.canViewMaterials,
          canEditMaterials: employee.canEditMaterials,
          canViewTests: employee.canViewTests,
          canEditTests: employee.canEditTests,
        },
      };
    }

    return {
      id: user.id,
      login: user.login,
      email: user.email,
      actorType: 'OWNER' as const,
      ownerUserId: user.id,
      employeeId: null,
    };
  }
}
