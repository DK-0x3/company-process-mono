import { authAPI } from '@entities/auth/api/api';
import { selectAuthIsAuthenticated, selectAuthUser } from '@entities/auth/model/selectors';
import { authActions } from '@entities/auth/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import {
	FC, ReactElement, useEffect
} from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
    children: ReactElement;
}

const PrivateRoute: FC<PrivateRouteProps> = ({ children }) => {
	const dispatch = useAppDispatch();
	const authenticated = useAppSelector(selectAuthIsAuthenticated);
	const authUser = useAppSelector(selectAuthUser);

	const {
		data: user,
		error,
		isError,
		isLoading
	} = authAPI.useGetUserQuery(undefined, {
		refetchOnMountOrArgChange: true,
		skip: !authenticated,
	});

	useEffect(() => {
		if (!isError || !error) return;
		if (!authenticated) return;

		const status = (error as any)?.status;

		if (status === 401) {
			dispatch(authActions.logout());
			dispatch(authAPI.util.resetApiState());
		}
	}, [
		isError,
		error,
		authenticated,
		dispatch,
	]);

	useEffect(() => {
		if (!user) return;
		
		dispatch(authActions.setUser(user));
	}, [user, dispatch]);

	if (!authenticated) {
		return <Navigate to="/login" replace />;
	}

	if (isLoading && !authUser) {
		return null;
	}

	if (!user && !authUser) {
		return <Navigate to="/login" replace />;
	}

	return children;
};

export default PrivateRoute;
