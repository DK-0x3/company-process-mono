import { EmployeeWorkspacePermissions } from './workspace-permission.types';

export interface CurrentUserData {
  id: number;
  login: string;
  email: string;
  actorType: 'OWNER' | 'EMPLOYEE';
  ownerUserId: number;
  employeeId?: number | null;
  permissions?: EmployeeWorkspacePermissions;
}
