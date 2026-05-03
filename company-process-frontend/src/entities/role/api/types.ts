import { Role } from '@entities/role/model/types/Role';

export interface CreateRoleRequest {
	name: string;
	description?: string;
}

export type CreateRoleResponse = Role;

export type GetAllRolesResponse = Role[];

export type GetByIdRoleResponse = Role;

export interface GetByIdRoleRequest {
	id: number;
}

export interface UpdateRoleRequest {
	id: number;
	name?: string;
	description?: string;
}

export type UpdateRoleResponse = Role;

export interface DeleteRoleRequest {
	id: number;
}
