
import { DataFlowType } from '@entities/process-data/api/types';
import { DataObject } from '@entities/data-object/model/types/DataObject';
import { Employee } from '@entities/employee/model/types/Employee';
import { Position } from '@entities/position/model/types/Position';
import { Role } from '@entities/role/model/types/Role';

export type TaskType = 'start' | 'end' | 'task' | 'decision' | 'parallel';

export interface Task {
    id: number;
    name: string;
    description: string;
    type?: TaskType;
    processId: number;
    employeeId: number | null;
    responsibleEmployeeId?: number | null;
    responsiblePositionId?: number | null;
    responsibleRoleId?: number | null;
    createdAt: Date;
    updatedAt: Date;
    responsibleEmployee?: Employee | null;
    responsiblePosition?: Position | null;
    responsibleRole?: Role | null;
    taskData?: {
        id: number;
        dataObjectId: number;
        type: DataFlowType;
        dataObject?: DataObject;
    }[];
    taskMaterials?: {
        id: number;
        materialId: number;
        material?: {
            id: number;
            name: string;
            categoryId?: number;
        };
    }[];
}
