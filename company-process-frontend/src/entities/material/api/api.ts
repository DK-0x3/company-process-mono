import {
	CreateMaterialCategoryRequest,
	CreateMaterialCategoryResponse,
	CreateMaterialRequest,
	CreateMaterialResponse,
	DeleteMaterialCategoryRequest,
	DeleteMaterialRequest,
	GetAllMaterialCategoriesResponse,
	GetAllMaterialsResponse,
	GetByIdMaterialRequest,
	GetByIdMaterialResponse,
	UpdateMaterialCategoryRequest,
	UpdateMaterialCategoryResponse,
	UpdateMaterialRequest,
	UpdateMaterialResponse,
} from '@entities/material/api/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV } from '@shared/config/ENV';
import { getToken } from '@shared/lib/auth/auth';

export const materialAPI = createApi({
	reducerPath: 'materialAPI',
	baseQuery: fetchBaseQuery({
		baseUrl: ENV.API_URL + '/materials',
		prepareHeaders: (headers) => {
			const token = getToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}

			return headers;
		},
	}),
	tagTypes: ['material', 'materialCategory'],
	endpoints: (builder) => ({
		createCategory: builder.mutation<CreateMaterialCategoryResponse, CreateMaterialCategoryRequest>({
			query: (data) => ({
				url: '/categories',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['materialCategory', 'material'],
		}),
		getAllCategories: builder.query<GetAllMaterialCategoriesResponse, void>({
			query: () => '/categories',
			providesTags: ['materialCategory'],
		}),
		updateCategory: builder.mutation<UpdateMaterialCategoryResponse, UpdateMaterialCategoryRequest>({
			query: ({ id, ...body }) => ({
				url: `/categories/${id}`,
				method: 'PUT',
				body,
			}),
			invalidatesTags: ['materialCategory', 'material'],
		}),
		deleteCategory: builder.mutation<void, DeleteMaterialCategoryRequest>({
			query: ({ id }) => ({
				url: `/categories/${id}`,
				method: 'DELETE',
			}),
			invalidatesTags: ['materialCategory', 'material'],
		}),

		create: builder.mutation<CreateMaterialResponse, CreateMaterialRequest>({
			query: (data) => ({
				url: '',
				method: 'POST',
				body: data,
			}),
			invalidatesTags: ['material', 'materialCategory'],
		}),
		getAll: builder.query<GetAllMaterialsResponse, void>({
			query: () => '',
			providesTags: ['material'],
		}),
		getById: builder.query<GetByIdMaterialResponse, GetByIdMaterialRequest>({
			query: ({ id }) => `/${id}`,
			providesTags: ['material'],
		}),
		update: builder.mutation<UpdateMaterialResponse, UpdateMaterialRequest>({
			query: ({ id, ...body }) => ({
				url: `/${id}`,
				method: 'PUT',
				body,
			}),
			invalidatesTags: ['material', 'materialCategory'],
		}),
		delete: builder.mutation<void, DeleteMaterialRequest>({
			query: ({ id }) => ({
				url: `/${id}`,
				method: 'DELETE',
			}),
			invalidatesTags: ['material', 'materialCategory'],
		}),
	}),
});
