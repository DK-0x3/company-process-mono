import { persistedReducer } from '@app/store/persist';
import { authAPI } from '@entities/auth/api/api';
import { cabinetAPI } from '@entities/cabinet/api/api';
import { dataObjectAPI } from '@entities/data-object/api/api';
import { employeeAPI } from '@entities/employee/api/api';
import { materialAPI } from '@entities/material/api/api';
import { positionAPI } from '@entities/position/api/api';
import { processDataAPI } from '@entities/process-data/api/api';
import { processAPI } from '@entities/process/api/api';
import { roleAPI } from '@entities/role/api/api';
import { schemeApi } from '@entities/scheme/api/api';
import { taskDataAPI } from '@entities/task-data/api/api';
import { taskAPI } from '@entities/task/api/api';
import { testAPI } from '@entities/test/api/api';
import { configureStore } from '@reduxjs/toolkit';
import { persistStore } from 'redux-persist';

const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: false,
		}).concat(
			authAPI.middleware,
			cabinetAPI.middleware,
			processAPI.middleware,
			employeeAPI.middleware,
			materialAPI.middleware,
			taskAPI.middleware,
			positionAPI.middleware,
			roleAPI.middleware,
			dataObjectAPI.middleware,
			processDataAPI.middleware,
			taskDataAPI.middleware,
			schemeApi.middleware,
			testAPI.middleware,
		),
});

export default store;

export const persistor = persistStore(store);
