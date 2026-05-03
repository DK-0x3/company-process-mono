import { createAsyncThunk } from '@reduxjs/toolkit';
import { AppDispatch } from '@shared/lib/store/types/AppDispatch';
import { RootState } from '@shared/lib/store/types/RootState';

// Типизированный AsyncThunkConfig
export interface ThunkConfig {
    state: RootState;
    dispatch: AppDispatch;
    rejectValue: string; // Опционально, если используете rejectWithValue
}

// Обертка для createAsyncThunk
export const createAppAsyncThunk = createAsyncThunk.withTypes<ThunkConfig>();
