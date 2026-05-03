import {
	CreateTestRequest,
	CreateTestResponse,
	DeleteTestRequest,
	GetAllTestsResponse,
	GetByIdTestRequest,
	GetByIdTestResponse,
	GetMyTestResultRequest,
	GetMyTestResultResponse,
	GetTestStatsRequest,
	GetTestStatsResponse,
	SubmitTestRequest,
	SubmitTestResponse,
	UpdateTestRequest,
	UpdateTestResponse,
} from '@entities/test/api/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';

export const testAPI = createApi({
	reducerPath: 'testAPI',
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/tests',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['test'],
	endpoints: (builder) => ({
		create: builder.mutation<CreateTestResponse, CreateTestRequest>({
			query: (data) => ({
				url: '',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['test'],
		}),
		getAll: builder.query<GetAllTestsResponse, void>({
			query: () => '',
			providesTags: ['test'],
		}),
		getById: builder.query<GetByIdTestResponse, GetByIdTestRequest>({
			query: ({ id }) => `/${id}`,
			providesTags: ['test'],
		}),
		getStats: builder.query<GetTestStatsResponse, GetTestStatsRequest>({
			query: ({ id }) => `/${id}/stats`,
			providesTags: ['test'],
		}),
		update: builder.mutation<UpdateTestResponse, UpdateTestRequest>({
			query: ({ id, ...body }) => ({
				url: `/${id}`,
				method: 'PUT',
				body,
			}),
			invalidatesTags: ['test'],
		}),
		delete: builder.mutation<void, DeleteTestRequest>({
			query: ({ id }) => ({
				url: `/${id}`,
				method: 'DELETE',
			}),
			invalidatesTags: ['test'],
		}),
		getMyResult: builder.query<GetMyTestResultResponse, GetMyTestResultRequest>({
			query: ({ id }) => `/${id}/my-result`,
			providesTags: ['test'],
		}),
		pass: builder.mutation<SubmitTestResponse, SubmitTestRequest>({
			query: ({ id, ...body }) => ({
				url: `/${id}/pass`,
				method: 'POST',
				body,
			}),
			invalidatesTags: ['test'],
		}),
	}),
});
