import { SetMetadata } from '@nestjs/common';
import {
  WorkspacePermissionAction,
  WorkspacePermissionEntity,
  WorkspacePermissionRequirement,
} from './workspace-permission.types';

export const WORKSPACE_PERMISSION_KEY = 'workspace_permission_requirement';

export const RequireWorkspacePermission = (
  entity: WorkspacePermissionEntity,
  action: WorkspacePermissionAction,
) =>
  SetMetadata(WORKSPACE_PERMISSION_KEY, {
    entity,
    action,
  } satisfies WorkspacePermissionRequirement);
