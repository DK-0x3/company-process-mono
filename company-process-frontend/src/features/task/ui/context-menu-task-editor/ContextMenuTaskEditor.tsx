import { taskActions, taskSelections } from '@entities/task/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { ContextMenu } from '@shared/ui/context-menu/ContextMenu';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { RefObject } from 'react';

interface ContextMenuTaskEditorProps {
	isOpen: boolean;
	onClose: VoidFunction;
	ref: RefObject<HTMLDivElement | null>;
	onClickUpdate: VoidFunction;
	onClickDelete: VoidFunction;
}

export const ContextMenuTaskEditor = ({
	isOpen,
	onClose,
	ref,
	onClickUpdate,
	onClickDelete,
}: ContextMenuTaskEditorProps) => {
	const dispatch = useAppDispatch();

	const task = useAppSelector(taskSelections.selectedTaskEditor);

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
		onClickUpdate();
	};

	const onDelete = () => {
		if (!task) return;

		dispatch(taskActions.setDeleteId(task.id));
		dispatch(taskActions.setIsActiveDeleteModal(true));
		onClickDelete();
	};

	const onOpenView = () => {
		if (!task) return;

		dispatch(taskActions.setViewData(task));
		dispatch(taskActions.setIsActiveViewModal(true));
	};
	
	return (
		<ContextMenu
			isOpen={isOpen}
			onClose={onClose}
			anchorRef={ref as RefObject<HTMLElement>}
			placement="bottom-start"
			items={[
				{
					label: 'Открыть',
					onClick: onOpenView,
					icon: <SmartIcon iconName={'scheme'}/>,
				},
				{
					label: 'Редактировать',
					onClick: onUpdate,
					icon: <SmartIcon iconName={'edit'}/>,
				},
				{
					label: 'Удалить',
					onClick: onDelete,
					icon: <SmartIcon iconName={'trash'}/>,
				},
			]}
		/>
	);
};
