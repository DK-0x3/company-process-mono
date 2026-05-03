import { CreateTaskRequest, UpdateTaskRequest } from '@entities/task/api/types';
import { Task } from '@entities/task/model/types/Task';
import { TaskState } from '@entities/task/model/types/TaskState';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: TaskState = {
	isActiveCreateModal: false,
	isActiveUpdateModal: false,
	isActiveViewModal: false,
	isActiveMoveModal: false,
	isActiveDeleteModal: false,

	createData: {
		name: '',
		processId: 0,
	},
	updateData: {
		id: 0,
	},
	viewData: null,
	moveData: null,
	deleteId: null,

	selectedTaskEditor: null,
	onlyCreateFirstListener: null,
	onlyUpdateFirstListener: null,
	onlyDeleteFirstListener: null,
};

export const taskSlice = createSlice({
	name: 'task',
	initialState,
	selectors: {
		isActiveCreateModal: (state) => state.isActiveCreateModal,
		isActiveUpdateModal: (state) => state.isActiveUpdateModal,
		isActiveViewModal: (state) => state.isActiveViewModal,
		isActiveMoveModal: (state) => state.isActiveMoveModal,
		isActiveDeleteModal: (state) => state.isActiveDeleteModal,
		createData: (state) => state.createData,
		updateData: (state) => state.updateData,
		viewData: (state) => state.viewData,
		moveData: (state) => state.moveData,
		deleteId: (state) => state.deleteId,
		selectedTaskEditor: (state) => state.selectedTaskEditor,
		onlyCreateListener: (state) => state.onlyCreateFirstListener,
		onlyUpdateFirstListener: (state) => state.onlyUpdateFirstListener,
		onlyDeleteFirstListener: (state) => state.onlyDeleteFirstListener,
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
		setIsActiveMoveModal: (state, action: PayloadAction<boolean>) => {
			state.isActiveMoveModal = action.payload;
		},
		setIsActiveDeleteModal: (state, action: PayloadAction<boolean>) => {
			state.isActiveDeleteModal = action.payload;
		},
		setCreateData: (state, action: PayloadAction<Partial<CreateTaskRequest>>) => {
			state.createData = {
				...state.createData,
				...action.payload 
			};
		},
		setUpdateData: (state, action: PayloadAction<Partial<UpdateTaskRequest>>) => {
			state.updateData = {
				...state.updateData,
				...action.payload
			};
		},
		setViewData: (state, action: PayloadAction<Task | null>) => {
			state.viewData = action.payload;
		},
		setMoveData: (state, action: PayloadAction<Task | null>) => {
			state.moveData = action.payload;
		},
		setDeleteId: (state, action: PayloadAction<number | null>) => {
			state.deleteId = action.payload;
		},
		setSelectedTaskEditor: (state, action: PayloadAction<Task | null>) => {
			state.selectedTaskEditor = action.payload;
		},
		setOnlyCreateTaskListener: (state, action: PayloadAction<((task: Task) => void) | null>) => {
			state.onlyCreateFirstListener = action.payload;
		},
		setOnlyUpdateTaskListener: (state, action: PayloadAction<((task: Task) => void) | null>) => {
			state.onlyUpdateFirstListener = action.payload;
		},
		setOnlyDeleteTaskListener: (state, action: PayloadAction<((task: Task) => void) | null>) => {
			state.onlyDeleteFirstListener = action.payload;
		},
	}
});

export const {
	actions: taskActions, selectors: taskSelections, reducer: taskReducer
} = taskSlice;