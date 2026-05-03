import {
	EmployeeLoginRequest,
	GetUserResponse,
	LoginRequest, LoginResponse, RegisterRequest, RegisterResponse
} from '@entities/auth/api/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';

export const authAPI = createApi({
	reducerPath: 'authAPI',
	refetchOnReconnect: true,
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/auth',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['auth'],
	endpoints: (builder) => ({
		login: builder.mutation<LoginResponse, LoginRequest>({
			query: (data) => ({
				url: '/login',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['auth'],
		}),
		employeeLogin: builder.mutation<LoginResponse, EmployeeLoginRequest>({
			query: (data) => ({
				url: '/employee-login',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['auth'],
		}),
		register: builder.mutation<RegisterResponse, RegisterRequest>({
			query: (data) => ({
				url: '/register',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['auth'],
		}),
		getUser: builder.query<GetUserResponse, void>({
			query: () => '/me',
			providesTags: ['auth'],
		})
	}),
});
