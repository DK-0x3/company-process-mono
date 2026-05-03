import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CurrentUserData } from './current-user.interface';
import { WORKSPACE_PERMISSION_KEY } from './workspace-permission.decorator';
import {
  EmployeeWorkspacePermissions,
  WorkspacePermissionRequirement,
} from './workspace-permission.types';

@Injectable()
export class WorkspacePermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserData | undefined;

    if (!user) {
      throw new ForbiddenException('Пользователь не авторизован');
    }

    if (user.actorType === 'OWNER') {
      return true;
    }

    const requirement =
      this.reflector.getAllAndOverride<WorkspacePermissionRequirement>(
        WORKSPACE_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requirement) {
      throw new ForbiddenException('Для этого действия не настроено правило доступа');
    }

    const permissions = user.permissions;
    if (!permissions) {
      throw new ForbiddenException('Права сотрудника не найдены');
    }

    if (!this.hasPermission(permissions, requirement)) {
      throw new ForbiddenException('Недостаточно прав для выполнения действия');
    }

    return true;
  }

  private hasPermission(
    permissions: EmployeeWorkspacePermissions,
    requirement: WorkspacePermissionRequirement,
  ): boolean {
    const { entity, action } = requirement;

    const map: Record<
      WorkspacePermissionRequirement['entity'],
      {
        view: keyof EmployeeWorkspacePermissions;
        edit: keyof EmployeeWorkspacePermissions;
      }
    > = {
      processes: { view: 'canViewProcesses', edit: 'canEditProcesses' },
      tasks: { view: 'canViewTasks', edit: 'canEditTasks' },
      positions: { view: 'canViewPositions', edit: 'canEditPositions' },
      dataObjects: { view: 'canViewDataObjects', edit: 'canEditDataObjects' },
      materials: { view: 'canViewMaterials', edit: 'canEditMaterials' },
      tests: { view: 'canViewTests', edit: 'canEditTests' },
    };

    const binding = map[entity];
    if (action === 'edit') {
      return Boolean(permissions[binding.edit]);
    }

    return Boolean(permissions[binding.view] || permissions[binding.edit]);
  }
}
