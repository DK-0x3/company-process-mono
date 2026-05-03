import {
	CreateRoleRequest,
	CreateRoleResponse,
	DeleteRoleRequest,
	GetAllRolesResponse,
	GetByIdRoleRequest,
	GetByIdRoleResponse,
	UpdateRoleRequest,
	UpdateRoleResponse,
} from '@entities/role/api/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';

export const roleAPI = createApi({
	reducerPath: 'roleAPI',
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/roles',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['role'],
	endpoints: (builder) => ({
		create: builder.mutation<CreateRoleResponse, CreateRoleRequest>({
			query: (data) => ({
				url: '',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['role'],
		}),
		getAll: builder.query<GetAllRolesResponse, void>({
			query: () => '',
			providesTags: ['role'],
		}),
		getById: builder.query<GetByIdRoleResponse, GetByIdRoleRequest>({
			query: ({ id }) => `/${id}`,
			providesTags: ['role'],
		}),
		update: builder.mutation<UpdateRoleResponse, UpdateRoleRequest>({
			query: ({ id, ...body }) => ({
				url: `/${id}`,
				method: 'PUT',
				body,
			}),
			invalidatesTags: ['role'],
		}),
		delete: builder.mutation<void, DeleteRoleRequest>({
			query: ({ id }) => ({
				url: `/${id}`,
				method: 'DELETE',
			}),
			invalidatesTags: ['role'],
		}),
	}),
});
