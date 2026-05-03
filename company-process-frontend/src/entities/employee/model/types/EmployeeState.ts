import { CreateEmployeeRequest, UpdateEmployeeRequest } from '@entities/employee/api/types';
import { Employee } from '@entities/employee/model/types/Employee';

export interface EmployeeState {
    isActiveCreateModal: boolean;
    isActiveUpdateModal: boolean;
    isActiveViewModal: boolean;
    isActiveDeleteModal: boolean;
    
    createData: CreateEmployeeRequest;
    updateData: UpdateEmployeeRequest;
    viewData: Employee | null;
    deleteId: number | null;
}