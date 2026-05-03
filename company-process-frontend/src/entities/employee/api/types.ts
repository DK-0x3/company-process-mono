import { Employee, EmployeePermissions } from '@entities/employee/model/types/Employee';

export interface CreateEmployeeRequest {
    fullName: string;
    birthDate: Date;
    hireDate: Date;
    email: string;
    positionId?: number;
    roleId?: number;
    phone?: string;
    address?: string;
    accountLogin?: string;
    accountPassword?: string;
    permissions?: Partial<EmployeePermissions>;
}

export type CreateEmployeeResponse = Employee;

export type GetAllEmployeesResponse = Employee[];

export type GetByIdEmployeeResponse = Employee;

export interface GetByIdEmployeeRequest {
    id: number;
}

export interface UpdateEmployeeRequest {
    id: number;
    fullName?: string;
    birthDate?: Date;
    hireDate?: Date;
    email?: string;
    phone?: string;
    address?: string;
    positionId?: number;
    roleId?: number;
    accountLogin?: string;
    accountPassword?: string;
    permissions?: Partial<EmployeePermissions>;
}

export type UpdateEmployeeResponse = Employee;

export interface DeleteEmployeeRequest {
    id: number;
}
