import {
	CreateTaskDataRequest,
	CreateTaskDataResponse,
	DeleteTaskDataRequest,
	GetAllTaskDataRequest,
	GetAllTaskDataResponse,
} from '@entities/task-data/api/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';

export const taskDataAPI = createApi({
	reducerPath: 'taskDataAPI',
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/task-data',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['taskData'],
	endpoints: (builder) => ({
		create: builder.mutation<CreateTaskDataResponse, CreateTaskDataRequest>({
			query: (data) => ({
				url: '',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['taskData'],
		}),
		getAll: builder.query<GetAllTaskDataResponse, GetAllTaskDataRequest | void>({
			query: (params) => ({
				url: '',
				params: params?.taskId !== undefined ? { taskId: params.taskId } : undefined,
			}),
			providesTags: ['taskData'],
		}),
		delete: builder.mutation<void, DeleteTaskDataRequest>({
			query: ({ id }) => ({
				url: `/${id}`,
				method: 'DELETE',
			}),
			invalidatesTags: ['taskData'],
		}),
	}),
});
