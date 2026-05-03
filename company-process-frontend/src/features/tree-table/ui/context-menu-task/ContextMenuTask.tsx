import { canEditEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { taskActions } from '@entities/task/model/slice';
import { Task } from '@entities/task/model/types/Task';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { ContextMenu } from '@shared/ui/context-menu/ContextMenu';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { RefObject } from 'react';

interface ContextMenuProcessProps {
	task?: Task;
	isOpen: boolean;
	onClose: VoidFunction;
	ref: RefObject<HTMLDivElement | null>;
}

export const ContextMenuTask = ({
	task,
	isOpen,
	onClose,
	ref,
}: ContextMenuProcessProps) => {
	const dispatch = useAppDispatch();
	const authUser = useAppSelector(selectAuthUser);
	const canEditTasks = canEditEntity(authUser, 'tasks');

	const onUpdate = () => {
		if (!task) return;

		dispatch(taskActions.setUpdateData({
			id: task.id,
			name: task.name,
			description: task.description,
			processId: task.processId,
			responsiblePositionId: task.responsiblePositionId
				?? task.responsibleEmployee?.positionId
				?? undefined,
		}));

		dispatch(taskActions.setIsActiveUpdateModal(true));
	};
	
	const onDelete = () => {
		if (!task) return;
		
		dispatch(taskActions.setDeleteId(task.id));
		dispatch(taskActions.setIsActiveDeleteModal(true));
	};
	
	return (
		<ContextMenu
			isOpen={isOpen}
			onClose={onClose}
			anchorRef={ref as RefObject<HTMLElement>}
			placement="bottom-start"
			items={[
				...(canEditTasks ? [{
					label: 'Редактировать',
					onClick: onUpdate,
					icon: <SmartIcon iconName={'edit'}/>,
				}] : []),
				...(canEditTasks ? [{
					label: 'Удалить',
					onClick: onDelete,
					icon: <SmartIcon iconName={'trash'}/>,
				}] : []),
			]}
		/>
	);
};
