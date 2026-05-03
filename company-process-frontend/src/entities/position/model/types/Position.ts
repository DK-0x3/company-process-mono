import type { Employee } from '@entities/employee/model/types/Employee';
import type { Task } from '@entities/task/model/types/Task';

export interface Position {
    id: number;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
    employees?: Employee[];
    responsibleProcesses?: {
        id: number;
        name: string;
        isActive?: boolean;
        version?: number;
    }[];
    responsibleTasks?: Pick<Task, 'id' | 'name' | 'type' | 'processId'>[];
}
