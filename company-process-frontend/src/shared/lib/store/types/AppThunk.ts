import { AppDispatch } from '@shared/lib/store/types/AppDispatch';
import { RootState } from '@shared/lib/store/types/RootState';

export type AppThunk<ReturnType = void> = (
    dispatch: AppDispatch,
    getState: () => RootState,
) => ReturnType;