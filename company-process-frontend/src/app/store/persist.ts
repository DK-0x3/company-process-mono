import { reducers } from '@app/store/reducers';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const persist = {
	key: 'root',
	version: 1,
	storage,

	whitelist: [],
};

export const persistedReducer = persistReducer(persist, reducers);