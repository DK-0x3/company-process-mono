import { canEditEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { processActions } from '@entities/process/model/slice';
import { Process } from '@entities/process/model/types/Process';
import { taskActions } from '@entities/task/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import routes from '@shared/config/routes';
import { ContextMenu } from '@shared/ui/context-menu/ContextMenu';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { RefObject } from 'react';
import { useNavigate } from 'react-router-dom';

interface ContextMenuProcessProps {
	process?: Process;
	isOpen: boolean;
	onClose: VoidFunction;
	ref: RefObject<HTMLDivElement | null>;
}

export const ContextMenuProcess = ({
	process,
	isOpen,
	onClose,
	ref,
}: ContextMenuProcessProps) => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const authUser = useAppSelector(selectAuthUser);
	const canEditProcesses = canEditEntity(authUser, 'processes');
	const canEditTasks = canEditEntity(authUser, 'tasks');

	const onCreateProcess = () => {
		if (!process) return;

		dispatch(processActions.setCreateProcessData({
			name: '',
			parentId: process.id,
		}));
		dispatch(processActions.setIsActiveCreateModal(true));
	};

	const onUpdateProcess = () => {
		if (!process) return;

		dispatch(processActions.setUpdateProcessData({
			id: process.id,
			name: process.name,
			description: process.description ?? undefined,
			parentId: process.parentId ?? undefined,
			responsiblePositionId: process.responsiblePositionId
				?? process.employee?.positionId
				?? undefined,
		}));

		dispatch(processActions.setIsActiveUpdateModal(true));
	};

	const onDeleteProcess = () => {
		if (!process) return;

		dispatch(processActions.setDeleteProcessId(process.id));
		dispatch(processActions.setIsActiveDeleteModal(true));
	};

	const onCreateTask = () => {
		if (!process) return;

		dispatch(taskActions.setCreateData({
			processId: process.id,
		}));

		dispatch(taskActions.setIsActiveCreateModal(true));
	};

	const onOpenEditor = () => {
		if (!process) return;

		navigate(`editor/${process.id}`);
	};

	const onOpenDocumentation = () => {
		if (!process) return;

		navigate(routes.PROCESS_DOCUMENTATION.replace(':processId', String(process.id)));
	};
	
	return (
		<ContextMenu
			isOpen={isOpen}
			onClose={onClose}
			anchorRef={ref as RefObject<HTMLElement>}
			placement="bottom-start"
			items={[
				...(canEditProcesses ? [{
					label: 'Открыть схему',
					onClick: onOpenEditor,
					icon: <SmartIcon iconName={'scheme'}/>,
				}] : []),
				{
					label: 'Документация',
					onClick: onOpenDocumentation,
					icon: <SmartIcon iconName={'folder'}/>,
				},
				...(canEditProcesses ? [{
					label: 'Создать процесс',
					onClick: onCreateProcess,
					icon: <SmartIcon iconName={'create'}/>,
				}] : []),
				...(canEditTasks ? [{
					label: 'Создать Задачу',
					onClick: onCreateTask,
					icon: <SmartIcon iconName={'human'}/>,
				}] : []),
				...(canEditProcesses ? [{
					label: 'Редактировать',
					onClick: onUpdateProcess,
					icon: <SmartIcon iconName={'edit'}/>,
				}] : []),
				...(canEditProcesses ? [{
					label: 'Удалить',
					onClick: onDeleteProcess,
					icon: <SmartIcon iconName={'trash'}/>,
				}] : []),
			]}
		/>
	);
};
