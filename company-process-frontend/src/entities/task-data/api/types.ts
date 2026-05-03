import { DataObject } from '@entities/data-object/model/types/DataObject';
import { DataFlowType } from '@entities/process-data/api/types';

export interface TaskDataLink {
	id: number;
	taskId: number;
	dataObjectId: number;
	type: DataFlowType;
	dataObject?: DataObject;
}

export interface CreateTaskDataRequest {
	taskId: number;
	dataObjectId: number;
	type: DataFlowType;
}

export type CreateTaskDataResponse = TaskDataLink;

export interface GetAllTaskDataRequest {
	taskId?: number;
}

export type GetAllTaskDataResponse = TaskDataLink[];

export interface DeleteTaskDataRequest {
	id: number;
}
