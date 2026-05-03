import { employeeAPI } from '@entities/employee/api/api';
import {
	CreatePositionRequest, CreatePositionResponse, DeletePositionRequest, GetAllPositionsResponse,
	GetByIdPositionRequest, GetByIdPositionResponse, UpdatePositionRequest, UpdatePositionResponse
} from '@entities/position/api/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';

export const positionAPI = createApi({
	reducerPath: 'positionAPI',
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/positions',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['position'],
	endpoints: (builder) => ({
		create: builder.mutation<CreatePositionResponse, CreatePositionRequest>({
			query: (data) => ({
				url: '',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['position']
		}),
		getAll: builder.query<GetAllPositionsResponse, void>({
			query: () => '',
			providesTags: ['position'],
		}),
		getById: builder.query<GetByIdPositionResponse, GetByIdPositionRequest>({
			query: ({ id }) => `/${id}`,
			providesTags: ['position'],
		}),
		update: builder.mutation<UpdatePositionResponse, UpdatePositionRequest>({
			query: ({ id, ...body }) => ({
				url: `/${id}`,
				method: 'PUT',
				body,
			}),
			invalidatesTags: ['position'],

			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				await queryFulfilled;
				dispatch(employeeAPI.util.invalidateTags(['employee']));
			},
		}),
		delete: builder.mutation<void, DeletePositionRequest>({
			query: ({ id }) => ({
				url: `/${id}`,
				method: 'DELETE',
			}),
			invalidatesTags: ['position'],

			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				await queryFulfilled;
				dispatch(employeeAPI.util.invalidateTags(['employee']));
			},
		}),
	}),
});
