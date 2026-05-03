import {
	CreateDataObjectRequest,
	CreateDataObjectResponse,
	DeleteDataObjectRequest,
	GetAllDataObjectsResponse,
	GetByIdDataObjectRequest,
	GetByIdDataObjectResponse,
	UpdateDataObjectRequest,
	UpdateDataObjectResponse,
} from '@entities/data-object/api/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';

export const dataObjectAPI = createApi({
	reducerPath: 'dataObjectAPI',
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/data-objects',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['dataObject'],
	endpoints: (builder) => ({
		create: builder.mutation<CreateDataObjectResponse, CreateDataObjectRequest>({
			query: (data) => ({
				url: '',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['dataObject'],
		}),
		getAll: builder.query<GetAllDataObjectsResponse, void>({
			query: () => '',
			providesTags: ['dataObject'],
		}),
		getById: builder.query<GetByIdDataObjectResponse, GetByIdDataObjectRequest>({
			query: ({ id }) => `/${id}`,
			providesTags: ['dataObject'],
		}),
		update: builder.mutation<UpdateDataObjectResponse, UpdateDataObjectRequest>({
			query: ({ id, ...body }) => ({
				url: `/${id}`,
				method: 'PUT',
				body,
			}),
			invalidatesTags: ['dataObject'],
		}),
		delete: builder.mutation<void, DeleteDataObjectRequest>({
			query: ({ id }) => ({
				url: `/${id}`,
				method: 'DELETE',
			}),
			invalidatesTags: ['dataObject'],
		}),
	}),
});
