import { Position } from '@entities/position/model/types/Position';
import { Role } from '@entities/role/model/types/Role';

export interface EmployeePermissions {
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

export interface Employee {
    id: number;
    fullName: string;
    birthDate: Date;
    hireDate: Date;
    email: string;
    phone: string;
    address: string;
    positionId?: number | null;
    roleId?: number | null;
    position: Position | null;
    role?: Role | null;
    userAccount?: {
        id: number;
        login: string;
        email: string;
        visiblePassword: string | null;
        actorType: 'OWNER' | 'EMPLOYEE';
    } | null;
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
    createdAt: Date;
    updatedAt: Date;
}
