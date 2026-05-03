import { Process } from '@entities/process/model/types/Process';
import { ProcessTree } from '@entities/process/model/types/ProcessTree';
import { Task } from '@entities/task/model/types/Task';

export interface CreateProcessRequest {
    name: string;
    description?: string;
    goal?: string;
    parentId?: number;
    parentProcessId?: number;
    employeeId?: number;
    responsibleEmployeeId?: number;
    responsiblePositionId?: number;
    responsibleRoleId?: number;
    materialIds?: number[];
    version?: number;
    isActive?: boolean;
}

export type CreateProcessResponse = Process;

export type GetAllFlatProcessResponse = Process[];

export type GetAllTreeProcessResponse = ProcessTree[];

export type GetByIdProcessResponse = Process;

export interface GetByIdProcessRequest {
    id: number;
}

export interface UpdateProcessRequest {
    id: number;
    name?: string;
    description?: string;
    goal?: string;
    parentId?: number;
    parentProcessId?: number;
    employeeId?: number;
    responsibleEmployeeId?: number;
    responsiblePositionId?: number;
    responsibleRoleId?: number;
    materialIds?: number[];
    version?: number;
    isActive?: boolean;
}

export type UpdateProcessResponse = Process;

export interface DeleteProcessRequest {
    id: number;
}

export interface ChildrenProcess {
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
}

export interface ValidateProcessRequest {
    id: number;
}

export interface ValidateProcessResponse {
    processId: number;
    isValid: boolean;
    checks: {
        hasStart: boolean;
        hasEnd: boolean;
        allTasksConnected: boolean;
        noHangingTasks: boolean;
        noCyclesWithoutExit: boolean;
        allTasksHaveResponsiblePosition: boolean;
    };
    stats: {
        tasksCount: number;
        startsCount: number;
        endsCount: number;
        arrowsCount: number;
    };
    issues: {
        startTaskIds: number[];
        endTaskIds: number[];
        tasksWithoutComponentIds: number[];
        disconnectedTaskIds: number[];
        hangingTaskIds: number[];
        danglingInputTaskIds: number[];
        danglingOutputTaskIds: number[];
        cycleWithoutExitTaskIds: number[];
        missingResponsiblePositionTaskIds: number[];
        ignoredArrowIds: number[];
    };
    details: {
        tasks: {
            id: number;
            name: string;
            type: string;
            indegree: number;
            outdegree: number;
            hasResponsiblePosition: boolean;
        }[];
    };
}

export interface GetProcessDescriptionRequest {
    id: number;
}

export interface GetProcessDescriptionResponse {
    processId: number;
    text: string;
    generatedAt: string;
    steps: string[];
    participants: string[];
}

export interface GetProcessPassportRequest {
    id: number;
}

export interface GenerateProcessPdfRequest {
    id: number;
    companyName?: string;
}

export interface GetProcessPassportResponse {
    id: number;
    name: string;
    description: string | null;
    goal: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    responsible: {
        employeeId: number | null;
        positionId: number | null;
        roleId: number | null;
        label: string;
        employeesByPosition: Array<{
            id: number;
            fullName: string;
        }>;
    };
    participants: Array<{
        name: string;
        positionId?: number;
        roleId?: number;
        employees?: Array<{
            id: number;
            fullName: string;
            email: string;
        }>;
    }>;
    inputs: Array<{
        dataObjectId: number;
        name: string;
    }>;
    outputs: Array<{
        dataObjectId: number;
        name: string;
    }>;
    tasks: Array<{
        id: number;
        name: string;
        type: string;
        responsibleEmployeeId: number | null;
        responsiblePositionId: number | null;
        responsibleRoleId: number | null;
        responsible: string;
    }>;
    diagram: {
        ownerProcessId: number;
        processComponents: number;
        taskComponents: number;
        arrows: number;
    };
}
export type GetChildrenProcessByIdResponse = {
    processes: Process[];
    tasks: Task[];
};

export interface GetChildrenProcessByIdRequest {
    id: number;
}
