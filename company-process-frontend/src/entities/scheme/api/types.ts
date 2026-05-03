import { Process } from '@entities/process/model/types/Process';
import { ArrowActionConfig } from '@entities/scheme/model/types/ArrowActionConfig';
import { DotSide } from '@entities/scheme/model/types/DotSide';
import { ProcessActionConfig } from '@entities/scheme/model/types/ProcessActionConfig';
import { SchemeComponentType } from '@entities/scheme/model/types/SchemeComponentType';
import { TaskActionConfig } from '@entities/scheme/model/types/TaskActionConfig';
import { Task } from '@entities/task/model/types/Task';

export interface InitSchemeRequest {
    ownerProcessId: number;
    processes: ProcessActionConfig[];
    tasks: TaskActionConfig[];
    arrows: ArrowActionConfig[];
}

export interface InitSchemeResponse {
    processes: {
        id: number;
        x: number;
        y: number;
        width: number;
        height: number;
        type: SchemeComponentType.PROCESS;
        ownerProcessId: number;
        processId: number;
        process: Process;
    }[];
	    tasks: {
	        id: number;
	        x: number;
	        y: number;
	        width: number;
	        height: number;
	        type: SchemeComponentType.TASK;
	        ownerProcessId: number;
	        taskId: number;
	        task: Task;
	    }[];
    arrows: {
        id: number;
        type: SchemeComponentType.ARROW;
        ownerProcessId: number;
        fromSide: DotSide;
        fromOffset: number;
        fromProcessComponentId: number | null;
        fromTaskComponentId: number | null;
        toSide: DotSide;
        toOffset: number;
        toProcessComponentId: number | null;
        toTaskComponentId: number | null;
    }[];
}

export interface GetSchemeRequest {
    ownerProcessId: number;
}

export interface UpdateComponentRequest {
    ownerProcessId: number;
    componentId: number;
    type: SchemeComponentType;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export interface ArrowRequest extends ArrowActionConfig {
    ownerProcessId: number;
}

export interface CreateProcessComponentRequest {
    ownerProcessId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    processId: number;
}

export interface CreateTaskComponentRequest {
    ownerProcessId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    taskId: number;
}

export interface CreateProcessComponentResponse {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    type: SchemeComponentType.PROCESS;
    ownerProcessId: number;
    processId: number;
}

export interface CreateTaskComponentResponse {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    type: SchemeComponentType.TASK;
    ownerProcessId: number;
    taskId: number;
}
