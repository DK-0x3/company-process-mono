import { CreateProcessRequest, UpdateProcessRequest } from '@entities/process/api/types';
import { Process } from '@entities/process/model/types/Process';

export interface ProcessState {
    isActiveCreateProcessModal: boolean;
    isActiveUpdateProcessModal: boolean;
    isActiveViewProcessModal: boolean;
    isActiveDeleteProcessModal: boolean;

    createProcessData: CreateProcessRequest;
    updateProcessData: UpdateProcessRequest;
    viewProcessData: Process | null;
    deleteProcessId: number | null;

    selectedProcessEditor: Process | null;
    onlyCreateFirstListener: ((process: Process) => void) | null;
    onlyUpdateFirstListener: ((process: Process) => void) | null;
    onlyDeleteFirstListener: ((process: Process) => void) | null;
}