import { CreateTaskRequest, UpdateTaskRequest } from '@entities/task/api/types';
import { Task } from '@entities/task/model/types/Task';

export interface TaskState {
    isActiveCreateModal: boolean;
    isActiveUpdateModal: boolean;
    isActiveViewModal: boolean;
    isActiveMoveModal: boolean;
    isActiveDeleteModal: boolean;
    
    createData: CreateTaskRequest;
    updateData: UpdateTaskRequest;
    viewData: Task | null;
    moveData: Task | null;
    deleteId: number | null;

    selectedTaskEditor: Task | null;
    onlyCreateFirstListener: ((task: Task) => void) | null;
    onlyUpdateFirstListener: ((task: Task) => void) | null;
    onlyDeleteFirstListener: ((task: Task) => void) | null;
}