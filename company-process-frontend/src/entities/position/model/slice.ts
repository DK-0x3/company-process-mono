import { CreatePositionRequest, UpdatePositionRequest } from '@entities/position/api/types';
import { Position } from '@entities/position/model/types/Position';
import { PositionState } from '@entities/position/model/types/PositionState';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: PositionState = {
	isActiveCreateModal: false,
	isActiveUpdateModal: false,
	isActiveViewModal: false,
	isActiveDeleteModal: false,

	createData: {
		name: ''
	},
	updateData: {
		id: 0,
		name: '',
	},
	deleteData: null,
	viewData: null,
};

export const positionSlice = createSlice({
	name: 'position',
	initialState,
	selectors: {
		isActiveCreateModal: (state) => state.isActiveCreateModal,
		isActiveUpdateModal: (state) => state.isActiveUpdateModal,
		isActiveViewModal: (state) => state.isActiveViewModal,
		isActiveDeleteModal: (state) => state.isActiveDeleteModal,
		createData: (state) => state.createData,
		updateData: (state) => state.updateData,
		viewData: (state) => state.viewData,
		deleteData: (state) => state.deleteData,
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
		setCreateData: (state, action: PayloadAction<CreatePositionRequest>) => {
			state.createData = action.payload;
		},
		clearCreateData: (state) => {
			state.createData = {
				name: '',
			};
		},
		setUpdateData: (state, action: PayloadAction<Partial<UpdatePositionRequest>>) => {
			state.updateData = {
				...state.updateData,
				...action.payload,
			};
		},
		clearUpdateData: (state) => {
			state.updateData = {
				id: 0,
				name: '',
			};
		},
		setDeleteData: (state, action: PayloadAction<Position | null>) => {
			state.deleteData = action.payload;
		},
		setViewData: (state, action: PayloadAction<Position | null>) => {
			state.viewData = action.payload;
		},
	}
});

export const {
	actions: positionActions, selectors: positionSelectors, reducer: positionReducer
} = positionSlice;