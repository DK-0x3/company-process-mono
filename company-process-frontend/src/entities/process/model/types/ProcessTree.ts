import { Process } from '@entities/process/model/types/Process';

export interface ProcessTree extends Process {
    children: ProcessTree[];
}