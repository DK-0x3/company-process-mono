import { Task } from '@entities/task/model/types/Task';
import { TaskType } from '@entities/task/model/types/Task';

export interface CreateTaskRequest {
    name: string;
    processId: number;
    description?: string;
    employeeId?: number;
    responsibleEmployeeId?: number;
    responsiblePositionId?: number;
    responsibleRoleId?: number;
    materialIds?: number[];
    type?: TaskType;
}

export type CreateTaskResponse = Task;

export type GetAllTaskResponse = Task[];

export type GetByIdTaskResponse = Task;

export interface GetByIdTaskRequest {
    id: number;
}

export interface UpdateTaskRequest {
    id: number;
    name?: string;
    processId?: number;
    description?: string;
    employeeId?: number;
    responsibleEmployeeId?: number;
    responsiblePositionId?: number;
    responsibleRoleId?: number;
    materialIds?: number[];
    type?: TaskType;
}

export type UpdateTaskResponse = Task;

export interface DeleteTaskRequest {
    id: number;
}

export interface GetTaskPassportRequest {
    id: number;
}

export interface GetTaskPassportResponse {
    id: number;
    name: string;
    description: string | null;
    type: TaskType;
    process: {
        id: number;
        name: string;
    };
    responsible: {
        employeeId: number | null;
        positionId: number | null;
        roleId: number | null;
        label: string;
        employeesByPosition: Array<{
            id: number;
            fullName: string;
            email: string;
        }>;
    };
    inputs: Array<{
        dataObjectId: number;
        name: string;
    }>;
    outputs: Array<{
        dataObjectId: number;
        name: string;
    }>;
    previousTasks: Array<{
        id: number;
        name: string;
    }>;
    nextTasks: Array<{
        id: number;
        name: string;
    }>;
    updatedAt: string;
}
