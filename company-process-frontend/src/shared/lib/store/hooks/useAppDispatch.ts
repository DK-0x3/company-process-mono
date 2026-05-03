import { AppDispatch } from '@shared/lib/store/types/AppDispatch';
import { useDispatch } from 'react-redux';

export const useAppDispatch =
    () => useDispatch<AppDispatch>();
