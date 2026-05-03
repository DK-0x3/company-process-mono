import { Material, MaterialCategory } from '@entities/material/model/types/Material';

export interface CreateMaterialCategoryRequest {
	name: string;
	description?: string;
}

export interface UpdateMaterialCategoryRequest {
	id: number;
	name?: string;
	description?: string;
}

export interface DeleteMaterialCategoryRequest {
	id: number;
}

export type GetAllMaterialCategoriesResponse = MaterialCategory[];
export type CreateMaterialCategoryResponse = MaterialCategory;
export type UpdateMaterialCategoryResponse = MaterialCategory;

export interface CreateMaterialRequest {
	name: string;
	content: string;
	categoryId: number;
	processIds?: number[];
	taskIds?: number[];
}

export interface UpdateMaterialRequest {
	id: number;
	name?: string;
	content?: string;
	categoryId?: number;
	processIds?: number[];
	taskIds?: number[];
}

export interface DeleteMaterialRequest {
	id: number;
}

export interface GetByIdMaterialRequest {
	id: number;
}

export type CreateMaterialResponse = Material;
export type GetAllMaterialsResponse = Material[];
export type GetByIdMaterialResponse = Material;
export type UpdateMaterialResponse = Material;
