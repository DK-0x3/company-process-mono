import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';
import {
	EmployeeCabinetProcessDetailsResponse,
	EmployeeCabinetResponse,
	EmployeeCabinetTaskDetailsResponse,
	EmployeeCabinetTestListItem,
	EmployeeCabinetTestResultResponse,
} from '../model/types/EmployeeCabinet';

export const cabinetAPI = createApi({
	reducerPath: 'cabinetAPI',
	refetchOnReconnect: true,
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/cabinet',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['cabinet'],
	endpoints: (builder) => ({
		getMe: builder.query<EmployeeCabinetResponse, void>({
			query: () => '/me',
			providesTags: ['cabinet'],
		}),
		getProcessDetails: builder.query<EmployeeCabinetProcessDetailsResponse, number>({
			query: (processId) => `/processes/${processId}`,
			providesTags: ['cabinet'],
		}),
		getTaskDetails: builder.query<EmployeeCabinetTaskDetailsResponse, number>({
			query: (taskId) => `/tasks/${taskId}`,
			providesTags: ['cabinet'],
		}),
		getTests: builder.query<EmployeeCabinetTestListItem[], void>({
			query: () => '/tests',
			providesTags: ['cabinet'],
		}),
		getTestById: builder.query<EmployeeCabinetTestListItem, number>({
			query: (testId) => `/tests/${testId}`,
			providesTags: ['cabinet'],
		}),
		getTestResult: builder.query<EmployeeCabinetTestResultResponse | null, number>({
			query: (testId) => `/tests/${testId}/result`,
			providesTags: ['cabinet'],
		}),
		passTest: builder.mutation<
			EmployeeCabinetTestResultResponse,
			{
				testId: number;
				answers: Array<{
					questionId: number;
					selectedOptionIds?: number[];
					textAnswer?: string;
					usedHint?: boolean;
				}>;
				durationSeconds?: number;
			}
		>({
			query: ({ testId, ...body }) => ({
				url: `/tests/${testId}/pass`,
				method: 'POST',
				body,
			}),
			invalidatesTags: ['cabinet'],
		}),
	}),
});
