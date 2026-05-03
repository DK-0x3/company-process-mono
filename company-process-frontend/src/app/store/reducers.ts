import { authAPI } from '@entities/auth/api/api';
import { authReducer } from '@entities/auth/model/slice';
import { cabinetAPI } from '@entities/cabinet/api/api';
import { dataObjectAPI } from '@entities/data-object/api/api';
import { employeeAPI } from '@entities/employee/api/api';
import { materialAPI } from '@entities/material/api/api';
import { employeeReducer } from '@entities/employee/model/slice';
import { positionAPI } from '@entities/position/api/api';
import { positionReducer } from '@entities/position/model/slice';
import { processDataAPI } from '@entities/process-data/api/api';
import { processAPI } from '@entities/process/api/api';
import { processReducer } from '@entities/process/model/slice';
import { roleAPI } from '@entities/role/api/api';
import { schemeApi } from '@entities/scheme/api/api';
import { taskDataAPI } from '@entities/task-data/api/api';
import { taskAPI } from '@entities/task/api/api';
import { taskReducer } from '@entities/task/model/slice';
import { testAPI } from '@entities/test/api/api';
import { combineReducers } from '@reduxjs/toolkit';

export const reducers = combineReducers({
	auth: authReducer,
	process: processReducer,
	task: taskReducer,
	employee: employeeReducer,
	position: positionReducer,
	[authAPI.reducerPath]: authAPI.reducer,
	[cabinetAPI.reducerPath]: cabinetAPI.reducer,
	[processAPI.reducerPath]: processAPI.reducer,
	[employeeAPI.reducerPath]: employeeAPI.reducer,
	[materialAPI.reducerPath]: materialAPI.reducer,
	[taskAPI.reducerPath]: taskAPI.reducer,
	[positionAPI.reducerPath]: positionAPI.reducer,
	[roleAPI.reducerPath]: roleAPI.reducer,
	[dataObjectAPI.reducerPath]: dataObjectAPI.reducer,
	[processDataAPI.reducerPath]: processDataAPI.reducer,
	[taskDataAPI.reducerPath]: taskDataAPI.reducer,
	[schemeApi.reducerPath]: schemeApi.reducer,
	[testAPI.reducerPath]: testAPI.reducer,
});
