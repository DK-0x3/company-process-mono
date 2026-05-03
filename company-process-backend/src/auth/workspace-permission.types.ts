export type WorkspacePermissionEntity =
  | 'processes'
  | 'tasks'
  | 'positions'
  | 'dataObjects'
  | 'materials'
  | 'tests';

export type WorkspacePermissionAction = 'view' | 'edit';

export interface EmployeeWorkspacePermissions {
  canViewProcesses: boolean;
  canEditProcesses: boolean;
  canViewTasks: boolean;
  canEditTasks: boolean;
  canViewPositions: boolean;
  canEditPositions: boolean;
  canViewDataObjects: boolean;
  canEditDataObjects: boolean;
  canViewMaterials: boolean;
  canEditMaterials: boolean;
  canViewTests: boolean;
  canEditTests: boolean;
}

export interface WorkspacePermissionRequirement {
  entity: WorkspacePermissionEntity;
  action: WorkspacePermissionAction;
}
