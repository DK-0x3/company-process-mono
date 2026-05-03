import { RootState } from '@shared/lib/store/types/RootState';

export const selectAuthIsAuthenticated = (state: RootState)=>
	state.auth.isAuthenticated;

export const selectAuthUser = (state: RootState)=>
	state.auth.user;

