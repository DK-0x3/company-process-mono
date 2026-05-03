import { User } from '@entities/auth/model/types/User';

export interface LoginRequest {
    login: string;
    password: string;
}

export interface EmployeeLoginRequest {
    login: string;
    password: string;
}

export interface LoginResponse {
    message: string,
    user: User,
    token: string,
}

export interface RegisterRequest {
    login: string;
    email: string;
    password: string;
}

export interface RegisterResponse {
    message: string,
    user: User,
    token: string,
}

export type GetUserResponse = User;
