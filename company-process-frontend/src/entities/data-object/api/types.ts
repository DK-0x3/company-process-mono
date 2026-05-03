import { DataObject } from '@entities/data-object/model/types/DataObject';

export interface CreateDataObjectRequest {
	name: string;
	description?: string;
}

export type CreateDataObjectResponse = DataObject;

export type GetAllDataObjectsResponse = DataObject[];

export type GetByIdDataObjectResponse = DataObject;

export interface GetByIdDataObjectRequest {
	id: number;
}

export interface UpdateDataObjectRequest {
	id: number;
	name?: string;
	description?: string;
}

export type UpdateDataObjectResponse = DataObject;

export interface DeleteDataObjectRequest {
	id: number;
}
