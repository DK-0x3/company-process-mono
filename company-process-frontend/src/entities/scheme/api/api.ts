import {
	ArrowRequest,
	CreateProcessComponentRequest,
	CreateProcessComponentResponse,
	CreateTaskComponentRequest,
	CreateTaskComponentResponse,
	GetSchemeRequest, InitSchemeRequest, InitSchemeResponse, UpdateComponentRequest
} from '@entities/scheme/api/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';

export const schemeApi = createApi({
	reducerPath: 'schemeApi',
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/scheme',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['scheme'],
	endpoints: (builder) => ({
		initScheme: builder.mutation<InitSchemeResponse, InitSchemeRequest>({
			query: ({ ownerProcessId, ...data }) => ({
				url: `/${ownerProcessId}/full`,
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['scheme']
		}),
		getScheme: builder.query<InitSchemeResponse, GetSchemeRequest>({
			query: ({ ownerProcessId }) => ({
				url: `/${ownerProcessId}`,
				method: 'GET',
			}),
			providesTags: ['scheme']
		}),
		createProcessComponent: builder.mutation<CreateProcessComponentResponse, CreateProcessComponentRequest>({
			query: ({ ownerProcessId, ...body }) => ({
				url: `/${ownerProcessId}/process`,
				method: 'POST',
				body,
			}),
			invalidatesTags: ['scheme']
		}),
		createTaskComponent: builder.mutation<CreateTaskComponentResponse, CreateTaskComponentRequest>({
			query: ({ ownerProcessId, ...body }) => ({
				url: `/${ownerProcessId}/task`,
				method: 'POST',
				body,
			}),
			invalidatesTags: ['scheme']
		}),
		updateComponent: builder.mutation<void, UpdateComponentRequest>({
			query: ({
				ownerProcessId, type, componentId, ...body 
			}) => ({
				url: `/${ownerProcessId}/${type}/${componentId}`,
				method: 'PATCH',
				body,
			}),
			invalidatesTags: ['scheme']
		}),
		createArrow: builder.mutation<void, ArrowRequest>({
			query: ({ ownerProcessId, ...body }) => ({
				url: `/${ownerProcessId}/arrow`,
				method: 'POST',
				body,
			}),
			invalidatesTags: ['scheme']
		}),
		deleteArrow: builder.mutation<void, ArrowRequest>({
			query: ({ ownerProcessId, ...body }) => ({
				url: `/${ownerProcessId}/arrow/connection`,
				method: 'DELETE',
				body,
			}),
			invalidatesTags: ['scheme']
		}),
	})
});
