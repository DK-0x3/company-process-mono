import { AppLayout } from '@app/ui/AppLayout';
import { canEditEntity, canViewEntity } from '@entities/auth/lib/permissions';
import { selectAuthIsAuthenticated, selectAuthUser } from '@entities/auth/model/selectors';
import { EmployeeCabinetPage } from '@pages/employee-cabinet/EmployeeCabinetPage';
import { EmployeeCabinetTestsPage } from '@pages/employee-cabinet-tests/EmployeeCabinetTestsPage';
import { EmployeeCabinetTestPassPage } from '@pages/employee-cabinet-tests/EmployeeCabinetTestPassPage';
import { EditorPage } from '@pages/editor/EditorPage';
import { EmployeePage } from '@pages/employee/EmployeePage';
import { LoginPage } from '@pages/login/LoginPage';
import { MainPage } from '@pages/main/MainPage';
import NotFoundPage from '@pages/not-found/NotFoundPage';
import { PositionPage } from '@pages/position/PositionPage';
import { ProcessDocumentationPage } from '@pages/process-documentation/ProcessDocumentationPage';
import { DataObjectPage } from '@pages/data-object/DataObjectPage';
import { MaterialEditorPage } from '@pages/material/MaterialEditorPage';
import { MaterialPage } from '@pages/material/MaterialPage';
import { RolePage } from '@pages/role/RolePage';
import { TestEditorPage } from '@pages/test/TestEditorPage';
import { TestPassPage } from '@pages/test/TestPassPage';
import { TestPage } from '@pages/test/TestPage';
import { TestStatsPage } from '@pages/test/TestStatsPage';
import RegisterPage from '@pages/register/RegisterPage';
import routes from '@shared/config/routes';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import React from 'react';
import {
	Navigate, Route, Routes 
} from 'react-router-dom';

import PrivateRoute from './PrivateRoute';

const AppRouter: React.FC = () => {
	const authenticated = useAppSelector(selectAuthIsAuthenticated);
	const authUser = useAppSelector(selectAuthUser);
	const isEmployeeActor = authUser?.actorType === 'EMPLOYEE';
	const isOwnerActor = authUser?.actorType === 'OWNER';
	const canViewProcesses = canViewEntity(authUser, 'processes');
	const canViewPositions = canViewEntity(authUser, 'positions');
	const canViewDataObjects = canViewEntity(authUser, 'dataObjects');
	const canViewMaterials = canViewEntity(authUser, 'materials');
	const canViewTests = canViewEntity(authUser, 'tests');
	const canEditTests = canEditEntity(authUser, 'tests');
	const canEditMaterials = canEditEntity(authUser, 'materials');
	const isAuthResolved = !authenticated || Boolean(authUser);

	return (
		<Routes>
			{/* Приватные маршруты */}
			<Route
				path={routes.HOME}
				element={
					<PrivateRoute>
						<AppLayout />
					</PrivateRoute>
				}
			>
				<Route
					index
					element={
						!isAuthResolved
							? null
							: isEmployeeActor
								? canViewProcesses
									? <MainPage/>
									: <Navigate to={routes.CABINET} replace />
								: <MainPage/>
					}
				/>

				<Route
					path={routes.CABINET}
					element={
						!isAuthResolved
							? null
							: isEmployeeActor
								? <EmployeeCabinetPage/>
								: <Navigate to={routes.HOME} replace />
					}
				/>
				<Route
					path={routes.CABINET_TESTS}
					element={
						!isAuthResolved
							? null
							: isEmployeeActor && canViewTests
								? <EmployeeCabinetTestsPage/>
								: <Navigate to={routes.CABINET} replace />
					}
				/>
				<Route
					path={routes.CABINET_TEST_PASS}
					element={
						!isAuthResolved
							? null
							: isEmployeeActor && canViewTests
								? <EmployeeCabinetTestPassPage/>
								: <Navigate to={routes.CABINET} replace />
					}
				/>

				<Route
					path={routes.EMPLOYEE}
					element={!isAuthResolved ? null : isOwnerActor ? <EmployeePage/> : <Navigate to={routes.HOME} replace />}
				/>
				<Route
					path={routes.POSITION}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canViewPositions)) ? <PositionPage/> : <Navigate to={routes.CABINET} replace />}
				/>
				<Route
					path={routes.ROLE}
					element={!isAuthResolved ? null : isOwnerActor ? <RolePage/> : <Navigate to={routes.HOME} replace />}
				/>
				<Route
					path={routes.DATA_OBJECT}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canViewDataObjects)) ? <DataObjectPage/> : <Navigate to={routes.CABINET} replace />}
				/>
				<Route
					path={routes.MATERIAL}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canViewMaterials)) ? <MaterialPage/> : <Navigate to={routes.CABINET} replace />}
				/>
				<Route
					path={routes.MATERIAL_CREATE}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canViewMaterials && canEditMaterials)) ? <MaterialEditorPage/> : <Navigate to={routes.CABINET} replace />}
				/>
				<Route
					path={routes.MATERIAL_EDIT}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canViewMaterials && canEditMaterials)) ? <MaterialEditorPage/> : <Navigate to={routes.CABINET} replace />}
				/>
				<Route
					path={routes.TEST}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canEditTests)) ? <TestPage/> : <Navigate to={routes.CABINET_TESTS} replace />}
				/>
				<Route
					path={routes.TEST_CREATE}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canEditTests)) ? <TestEditorPage/> : <Navigate to={routes.CABINET} replace />}
				/>
				<Route
					path={routes.TEST_EDIT}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canEditTests)) ? <TestEditorPage/> : <Navigate to={routes.CABINET} replace />}
				/>
				<Route
					path={routes.TEST_PASS}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canEditTests)) ? <TestPassPage/> : <Navigate to={routes.CABINET} replace />}
				/>
				<Route
					path={routes.TEST_STATS}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canEditTests)) ? <TestStatsPage/> : <Navigate to={routes.CABINET} replace />}
				/>
				<Route
					path={routes.EDITOR}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canEditEntity(authUser, 'processes'))) ? <EditorPage/> : <Navigate to={routes.CABINET} replace />}
				/>
				<Route
					path={routes.PROCESS_DOCUMENTATION}
					element={!isAuthResolved ? null : (isOwnerActor || (isEmployeeActor && canViewProcesses)) ? <ProcessDocumentationPage/> : <Navigate to={routes.CABINET} replace />}
				/>
				
				<Route path={routes.NOT_FOUND} element={<NotFoundPage />} />
			</Route>

			{/* Публичные маршруты */}
			<Route
				path="/login"
				element={authenticated ? <Navigate to="/" replace /> : <LoginPage />}
			/>
			<Route
				path="/register"
				element={authenticated ? <Navigate to="/" replace /> : <RegisterPage />}
			/>

			{/* Фоллбэк */}
			<Route path="*" element={<Navigate to={routes.NOT_FOUND} replace />} />
		</Routes>
	);
};

export default AppRouter;
