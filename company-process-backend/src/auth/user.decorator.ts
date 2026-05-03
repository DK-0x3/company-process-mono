import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { EmployeeWorkspacePermissions } from './workspace-permission.types';

// Тип пользователя, который возвращает JwtStrategy
export interface JwtUser {
  id: number;
  login: string;
  email: string;
  actorType: 'OWNER' | 'EMPLOYEE';
  ownerUserId: number;
  employeeId?: number | null;
  permissions?: EmployeeWorkspacePermissions;
}

// Типизированный декоратор
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUser | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as JwtUser | undefined;
    return user ?? null;
  },
);
