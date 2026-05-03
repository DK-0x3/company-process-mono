import { CreateEmployeeModal } from '@features/employee/ui/create-employee-modal/CreateEmployeeModal';
import { DeleteEmployeeModal } from '@features/employee/ui/delete-employee-modal/DeleteEmployeeModal';
import { UpdateEmployeeModal } from '@features/employee/ui/update-employee-modal/UpdateEmployeeModal';
import { ViewEmployeeModal } from '@features/employee/ui/view-employee-modal/ViewEmployeeModal';
import { canEditEntity, canViewEntity } from '@entities/auth/lib/permissions';
import { CreatePositionModal } from '@features/position/ui/create-position-modal/CreatePositionModal';
import { DeletePositionModal } from '@features/position/ui/delete-position-modal/DeletePositionModal';
import { UpdatePositionModal } from '@features/position/ui/update-position-modal/UpdatePositionModal';
import { ViewPositionModal } from '@features/position/ui/view-position-modal/ViewPositionModal';
import { CreateProcessModal } from '@features/process/ui/create-process-modal/CreateProcessModal';
import { DeleteProcessModal } from '@features/process/ui/delete-process-modal/DeleteProcessModal';
import { UpdateProcessModal } from '@features/process/ui/update-process-modal/UpdateProcessModal';
import { ViewProcessModal } from '@features/process/ui/view-process-modal/ViewProcessModal';
import { CreateTaskModal } from '@features/task/ui/create-task-modal/CreateTaskModal';
import { DeleteTaskModal } from '@features/task/ui/delete-task-modal/DeleteTaskModal';
import { UpdateTaskModal } from '@features/task/ui/update-task-modal/UpdateTaskModal';
import { ViewTaskModal } from '@features/task/ui/view-task-modal/ViewTaskModal';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Navbar } from '@widgets/navbar/Navbar';
import { Outlet } from 'react-router-dom';

export const AppLayout = () => {
	const authUser = useAppSelector(selectAuthUser);
	const isOwnerActor = authUser?.actorType === 'OWNER';
	const isEmployeeActor = authUser?.actorType === 'EMPLOYEE';
	const canViewProcesses = canViewEntity(authUser, 'processes');
	const canEditProcesses = canEditEntity(authUser, 'processes');
	const canViewTasks = canViewEntity(authUser, 'tasks');
	const canEditTasks = canEditEntity(authUser, 'tasks');
	const canViewPositions = canViewEntity(authUser, 'positions');
	const canEditPositions = canEditEntity(authUser, 'positions');

	return (
		<>
			<Navbar />
			<Outlet/>

			{(isOwnerActor || (isEmployeeActor && canViewProcesses)) && (
				<>
					<ViewProcessModal/>
					{(isOwnerActor || (isEmployeeActor && canEditProcesses)) && (
						<>
							<CreateProcessModal/>
							<UpdateProcessModal/>
							<DeleteProcessModal/>
						</>
					)}
				</>
			)}

			{(isOwnerActor || (isEmployeeActor && canViewTasks)) && (
				<>
					<ViewTaskModal/>
					{(isOwnerActor || (isEmployeeActor && canEditTasks)) && (
						<>
							<CreateTaskModal/>
							<UpdateTaskModal/>
							<DeleteTaskModal/>
						</>
					)}
				</>
			)}

			{isOwnerActor && (
				<>
					<CreateEmployeeModal/>
					<UpdateEmployeeModal/>
					<ViewEmployeeModal/>
					<DeleteEmployeeModal/>
				</>
			)}

			{(isOwnerActor || (isEmployeeActor && canViewPositions)) && (
				<>
					<ViewPositionModal/>
				</>
			)}

			{(isOwnerActor || (isEmployeeActor && canEditPositions)) && (
				<>
					<CreatePositionModal/>
					<UpdatePositionModal/>
					<DeletePositionModal/>
				</>
			)}
		</>
	);
};
