import {
	CreateProcessDataRequest,
	CreateProcessDataResponse,
	DeleteProcessDataRequest,
	GetAllProcessDataRequest,
	GetAllProcessDataResponse,
} from '@entities/process-data/api/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';

export const processDataAPI = createApi({
	reducerPath: 'processDataAPI',
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/process-data',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['processData'],
	endpoints: (builder) => ({
		create: builder.mutation<CreateProcessDataResponse, CreateProcessDataRequest>({
			query: (data) => ({
				url: '',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['processData'],
		}),
		getAll: builder.query<GetAllProcessDataResponse, GetAllProcessDataRequest | void>({
			query: (params) => ({
				url: '',
				params: params?.processId !== undefined ? { processId: params.processId } : undefined,
			}),
			providesTags: ['processData'],
		}),
		delete: builder.mutation<void, DeleteProcessDataRequest>({
			query: ({ id }) => ({
				url: `/${id}`,
				method: 'DELETE',
			}),
			invalidatesTags: ['processData'],
		}),
	}),
});
