import { AuthState } from '@entities/auth/model/types/AuthState';
import { User } from '@entities/auth/model/types/User';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
	clearToken, getToken, isAuthenticated, setToken
} from '@shared/lib/auth/auth';

const initialState: AuthState = {
	user: null,
	token: getToken(),
	isAuthenticated: isAuthenticated(),
	loading: false,
	error: null,
};

export const authSlice = createSlice({
	name: 'user',
	initialState,
	reducers: {
		setToken: (state, action: PayloadAction<string | null>) => {
			state.token = action.payload;
			setToken(action.payload);
		},
		setUser: (
			state,
			action: PayloadAction<User>
		) => {
			state.user = action.payload;
			state.isAuthenticated = true;
		},
		logout: (state) => {
			state.user = null;
			state.token = null;
			state.isAuthenticated = false;
			clearToken();
		},
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload;
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload;
		},
	},
});

export const { actions: authActions, reducer: authReducer } = authSlice;