
import { processAPI } from '@entities/process/api/api';
import {
	CreateTaskRequest, CreateTaskResponse,
	DeleteTaskRequest, GetAllTaskResponse, GetByIdTaskRequest, GetByIdTaskResponse,
	GetTaskPassportRequest,
	GetTaskPassportResponse,
	UpdateTaskRequest, UpdateTaskResponse
} from '@entities/task/api/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';
import {Task} from "@entities/task/model/types/Task";

export const taskAPI = createApi({
	reducerPath: 'taskAPI',
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/tasks',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['task'],
	endpoints: (builder) => ({
		create: builder.mutation<CreateTaskResponse, CreateTaskRequest>({
			query: (data) => ({
				url: '',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['task'],

			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				await queryFulfilled;
				dispatch(processAPI.util.invalidateTags(['process']));
			},
		}),
		getAll: builder.query<GetAllTaskResponse, void>({
			query: () => '',
			providesTags: ['task'],
		}),
		getById: builder.query<GetByIdTaskResponse, GetByIdTaskRequest>({
			query: ({ id }) => `/${id}`,
			providesTags: ['task'],
		}),
		getPassport: builder.query<GetTaskPassportResponse, GetTaskPassportRequest>({
			query: ({ id }) => `/${id}/passport`,
			providesTags: ['task'],
		}),
		update: builder.mutation<UpdateTaskResponse, UpdateTaskRequest>({
			query: ({ id, ...body }) => ({
				url: `/${id}`,
				method: 'PUT',
				body,
			}),
			invalidatesTags: ['task'],

			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				await queryFulfilled;
				dispatch(processAPI.util.invalidateTags(['process']));
			},
		}),
		delete: builder.mutation<Task, DeleteTaskRequest>({
			query: ({ id }) => ({
				url: `/${id}`,
				method: 'DELETE',
			}),
			invalidatesTags: ['task'],

			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				await queryFulfilled;
				dispatch(processAPI.util.invalidateTags(['process']));
			},
		}),
	}),
});
