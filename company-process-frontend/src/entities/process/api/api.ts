import {
	CreateProcessRequest, CreateProcessResponse,
	DeleteProcessRequest, GetAllFlatProcessResponse, GetAllTreeProcessResponse,
	GetProcessDescriptionRequest,
	GetProcessDescriptionResponse,
	GetProcessPassportRequest,
	GetProcessPassportResponse,
	GenerateProcessPdfRequest,
	GetByIdProcessRequest,
	GetByIdProcessResponse,
	GetChildrenProcessByIdRequest, GetChildrenProcessByIdResponse, UpdateProcessRequest, UpdateProcessResponse,
	ValidateProcessRequest,
	ValidateProcessResponse
} from '@entities/process/api/types';
import { Process } from '@entities/process/model/types/Process';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';

export const processAPI = createApi({
	reducerPath: 'processAPI',
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/processes',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['process'],
	endpoints: (builder) => ({
		create: builder.mutation<CreateProcessResponse, CreateProcessRequest>({
			query: (data) => ({
				url: '',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['process']
		}),
		getAllFlat: builder.query<GetAllFlatProcessResponse, void>({
			query: () => '/flat',
			providesTags: ['process'],
		}),
		getAllTree: builder.query<GetAllTreeProcessResponse, void>({
			query: () => '/tree',
			providesTags: ['process'],
		}),
		getById: builder.query<GetByIdProcessResponse, GetByIdProcessRequest>({
			query: ({ id }) => `/${id}`,
			providesTags: ['process'],
		}),
		update: builder.mutation<UpdateProcessResponse, UpdateProcessRequest>({
			query: ({ id, ...body }) => ({
				url: `/${id}`,
				method: 'PUT',
				body,
			}),
			invalidatesTags: ['process']
		}),
		delete: builder.mutation<Process, DeleteProcessRequest>({
			query: ({ id }) => ({
				url: `/${id}`,
				method: 'DELETE',
			}),
			invalidatesTags: ['process']
		}),
		getChildrenProcessById: builder.query<GetChildrenProcessByIdResponse, GetChildrenProcessByIdRequest>({
			query: ({ id }) => `/${id}/subtree/flat`,
			providesTags: ['process'],
		}),
		validate: builder.query<ValidateProcessResponse, ValidateProcessRequest>({
			query: ({ id }) => `/${id}/validate`,
			providesTags: ['process'],
		}),
		getDescription: builder.query<GetProcessDescriptionResponse, GetProcessDescriptionRequest>({
			query: ({ id }) => `/${id}/description`,
			providesTags: ['process'],
		}),
		getPassport: builder.query<GetProcessPassportResponse, GetProcessPassportRequest>({
			query: ({ id }) => `/${id}/passport`,
			providesTags: ['process'],
		}),
		generatePdf: builder.mutation<Blob, GenerateProcessPdfRequest>({
			query: ({ id, ...body }) => ({
				url: `/${id}/pdf`,
				method: 'POST',
				body,
				responseHandler: async (response) => response.blob(),
			}),
		}),
	}),
});
