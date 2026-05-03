import { CreateEmployeeRequest, UpdateEmployeeRequest } from '@entities/employee/api/types';
import { Employee } from '@entities/employee/model/types/Employee';
import { EmployeeState } from '@entities/employee/model/types/EmployeeState';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const defaultPermissions = {
	canViewProcesses: false,
	canEditProcesses: false,
	canViewTasks: false,
	canEditTasks: false,
	canViewPositions: false,
	canEditPositions: false,
	canViewDataObjects: false,
	canEditDataObjects: false,
	canViewMaterials: false,
	canEditMaterials: false,
	canViewTests: false,
	canEditTests: false,
};

const initialState: EmployeeState = {
	isActiveCreateModal: false,
	isActiveUpdateModal: false,
	isActiveViewModal: false,
	isActiveDeleteModal: false,
	
	createData: {
		fullName: '',
		phone: '',
		address: '',
		birthDate: new Date(),
		hireDate: new Date(),
		email: '',
		positionId: 0,
		accountLogin: '',
		accountPassword: '',
		permissions: { ...defaultPermissions },
	},
	updateData: {
		id: 0,
	},
	deleteId: null,
	viewData: null,
};

export const employeeSlice = createSlice({
	name: 'employee',
	initialState,
	selectors: {
		isActiveCreateModal: (state) => state.isActiveCreateModal,
		isActiveUpdateModal: (state) => state.isActiveUpdateModal,
		isActiveViewModal: (state) => state.isActiveViewModal,
		isActiveDeleteModal: (state) => state.isActiveDeleteModal,
		createData: (state) => state.createData,
		updateData: (state) => state.updateData,
		viewData: (state) => state.viewData,
		deleteId: (state) => state.deleteId,
	},
	reducers: {
		setIsActiveCreateModal: (state, action: PayloadAction<boolean>) => {
			state.isActiveCreateModal = action.payload;
		},
		setIsActiveUpdateModal: (state, action: PayloadAction<boolean>) => {
			state.isActiveUpdateModal = action.payload;
		},
		setIsActiveViewModal: (state, action: PayloadAction<boolean>) => {
			state.isActiveViewModal = action.payload;
		},
		setIsActiveDeleteModal: (state, action: PayloadAction<boolean>) => {
			state.isActiveDeleteModal = action.payload;
		},
		setCreateData: (state, action: PayloadAction<Partial<CreateEmployeeRequest>>) => {
			state.createData = {
				...state.createData,
				...action.payload 
			};
		},
		clearCreateData: (state) => {
			state.createData = {
				fullName: '',
				phone: '',
				address: '',
				birthDate: new Date(),
				hireDate: new Date(),
				email: '',
				positionId: 0,
				accountLogin: '',
				accountPassword: '',
				permissions: { ...defaultPermissions },
			};
		},
		setUpdateData: (state, action: PayloadAction<Partial<UpdateEmployeeRequest>>) => {
			state.updateData = {
				...state.updateData,
				...action.payload,
			};
		},
		clearUpdateData: (state) => {
			state.updateData = {
				id: 0,
			};
		},
		setDeleteId: (state, action: PayloadAction<number | null>) => {
			state.deleteId = action.payload;
		},
		setViewData: (state, action: PayloadAction<Employee | null>) => {
			state.viewData = action.payload;
		},
	}
});

export const {
	actions: employeeActions, selectors: employeeSelections, reducer: employeeReducer
} = employeeSlice;
