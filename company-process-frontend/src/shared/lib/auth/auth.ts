const JWT_TOKEN_NAME = 'jwt-token';

export const getToken = (): string | null => {
	return localStorage.getItem(JWT_TOKEN_NAME);
};

export const setToken = (token: string | null): void => {
	if (!token) {
		localStorage.removeItem(JWT_TOKEN_NAME);
		return;
	}
	localStorage.setItem(JWT_TOKEN_NAME, token);
};

export const clearToken = (): void => {
	localStorage.removeItem(JWT_TOKEN_NAME);
};

export const isAuthenticated = (): boolean => {
	return !!getToken();
};
