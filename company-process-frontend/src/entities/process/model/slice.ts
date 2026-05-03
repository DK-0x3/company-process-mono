import { CreateProcessRequest, UpdateProcessRequest } from '@entities/process/api/types';
import { Process } from '@entities/process/model/types/Process';
import { ProcessState } from '@entities/process/model/types/ProcessState';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: ProcessState = {
	isActiveCreateProcessModal: false,
	isActiveUpdateProcessModal: false,
	isActiveViewProcessModal: false,
	isActiveDeleteProcessModal: false,

	createProcessData: {
		name: '',
	},
	updateProcessData: {
		id: 0,
	},
	deleteProcessId: null,
	viewProcessData: null,

	selectedProcessEditor: null,
	onlyCreateFirstListener: null,
	onlyUpdateFirstListener: null,
	onlyDeleteFirstListener: null,
};

export const processSlice = createSlice({
	name: 'process',
	initialState,
	selectors: {
		IsActiveCreateModal: (state) => state.isActiveCreateProcessModal,
		IsActiveUpdateModal: (state) => state.isActiveUpdateProcessModal,
		IsActiveViewModal: (state) => state.isActiveViewProcessModal,
		IsActiveDeleteModal: (state) => state.isActiveDeleteProcessModal,
		createProcessData: (state) => state.createProcessData,
		updateProcessData: (state) => state.updateProcessData,
		viewProcessData: (state) => state.viewProcessData,
		deleteProcessId: (state) => state.deleteProcessId,
		selectedProcessEditor: (state) => state.selectedProcessEditor,
		onlyCreateProcessListener: (state) => state.onlyCreateFirstListener,
		onlyUpdateFirstListener: (state) => state.onlyUpdateFirstListener,
		onlyDeleteFirstListener: (state) => state.onlyDeleteFirstListener,
	},
	reducers: {
		setIsActiveCreateModal: (state, action: PayloadAction<boolean>) => {
			state.isActiveCreateProcessModal = action.payload;
		},
		setIsActiveUpdateModal: (state, action: PayloadAction<boolean>) => {
			state.isActiveUpdateProcessModal = action.payload;
		},
		setIsActiveViewModal: (state, action: PayloadAction<boolean>) => {
			state.isActiveViewProcessModal = action.payload;
		},
		setIsActiveDeleteModal: (state, action: PayloadAction<boolean>) => {
			state.isActiveDeleteProcessModal = action.payload;
		},
		setCreateProcessData: (state, action: PayloadAction<Partial<CreateProcessRequest>>) => {
			state.createProcessData = {
				...state.createProcessData,
				...action.payload 
			};
		},
		setUpdateProcessData: (state, action: PayloadAction<UpdateProcessRequest>) => {
			state.updateProcessData = action.payload;
		},
		setDeleteProcessId: (state, action: PayloadAction<number | null>) => {
			state.deleteProcessId = action.payload;
		},
		setViewProcessData: (state, action: PayloadAction<Process | null>) => {
			state.viewProcessData = action.payload;
		},
		setSelectedProcessEditor: (state, action: PayloadAction<Process | null>) => {
			state.selectedProcessEditor = action.payload;
		},
		setOnlyCreateProcessListener: (state, action: PayloadAction<((process: Process) => void) | null>) => {
			state.onlyCreateFirstListener = action.payload;
		},
		setOnlyUpdateProcessListener: (state, action: PayloadAction<((process: Process) => void) | null>) => {
			state.onlyUpdateFirstListener = action.payload;
		},
		setOnlyDeleteProcessListener: (state, action: PayloadAction<((process: Process) => void) | null>) => {
			state.onlyDeleteFirstListener = action.payload;
		},
	}
});

export const {
	actions: processActions, selectors: processSelections, reducer: processReducer 
} = processSlice;