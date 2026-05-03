import { Employee } from '@entities/employee/model/types/Employee';
import { Position } from '@entities/position/model/types/Position';
import { DataFlowType } from '@entities/process-data/api/types';
import { DataObject } from '@entities/data-object/model/types/DataObject';
import { Role } from '@entities/role/model/types/Role';
import { Task } from '@entities/task/model/types/Task';

export interface Process {
    id: number;
    name: string;
    description: string | null;
    goal?: string | null;
    parentId: number | null;
    employeeId: number | null;
    responsibleEmployeeId?: number | null;
    responsiblePositionId?: number | null;
    responsibleRoleId?: number | null;
    version?: number;
    isActive?: boolean;
    createdAt: Date;
    updatedAt: Date;
    employee: Employee | null;
    responsibleEmployee?: Employee | null;
    responsiblePosition?: Position | null;
    responsibleRole?: Role | null;
    tasks: Task[],
    processData?: {
        id: number;
        dataObjectId: number;
        type: DataFlowType;
        dataObject?: DataObject;
    }[];
    processMaterials?: {
        id: number;
        materialId: number;
        material?: {
            id: number;
            name: string;
            categoryId?: number;
        };
    }[];
    // parent: Process | null; пока что не нужно
}
