import {
	CreateEmployeeRequest, CreateEmployeeResponse, DeleteEmployeeRequest, GetAllEmployeesResponse,
	GetByIdEmployeeRequest, GetByIdEmployeeResponse, UpdateEmployeeRequest, UpdateEmployeeResponse
} from '@entities/employee/api/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';
import { Utils } from '@shared/lib/utils/Utils';

export const employeeAPI = createApi({
	reducerPath: 'employeeAPI',
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/employees',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['employee'],
	endpoints: (builder) => ({
		create: builder.mutation<CreateEmployeeResponse, CreateEmployeeRequest>({
			query: (data) => ({
				url: '',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['employee']
		}),
		getAll: builder.query<GetAllEmployeesResponse, void>({
			query: () => '',
			transformResponse: (response: GetAllEmployeesResponse) => Utils.convertDates(response),
			providesTags: ['employee'],
		}),
		getById: builder.query<GetByIdEmployeeResponse, GetByIdEmployeeRequest>({
			query: ({ id }) => `/${id}`,
			transformResponse: (response: GetByIdEmployeeResponse) => Utils.convertDates(response),
			providesTags: ['employee'],
		}),
		update: builder.mutation<UpdateEmployeeResponse, UpdateEmployeeRequest>({
			query: ({ id, ...body }) => ({
				url: `/${id}`,
				method: 'PUT',
				body,
			}),
			invalidatesTags: ['employee']
		}),
		delete: builder.mutation<void, DeleteEmployeeRequest>({
			query: ({ id }) => ({
				url: `/${id}`,
				method: 'DELETE',
			}),
			invalidatesTags: ['employee']
		}),
	}),
});
