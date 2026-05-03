import store from '@app/store/store';

export type RootState = ReturnType<typeof store.getState>;