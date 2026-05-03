import { DataObject } from '@entities/data-object/model/types/DataObject';

export type DataFlowType = 'input' | 'output';

export interface ProcessDataLink {
	id: number;
	processId: number;
	dataObjectId: number;
	type: DataFlowType;
	dataObject?: DataObject;
}

export interface CreateProcessDataRequest {
	processId: number;
	dataObjectId: number;
	type: DataFlowType;
}

export type CreateProcessDataResponse = ProcessDataLink;

export interface GetAllProcessDataRequest {
	processId?: number;
}

export type GetAllProcessDataResponse = ProcessDataLink[];

export interface DeleteProcessDataRequest {
	id: number;
}
