import { processActions, processSelections } from '@entities/process/model/slice';
import { taskActions } from '@entities/task/model/slice';
import routes from '@shared/config/routes';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { ContextMenu } from '@shared/ui/context-menu/ContextMenu';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { RefObject } from 'react';
import { useNavigate } from 'react-router-dom';

interface ContextMenuProcessEditorProps {
	isOpen: boolean;
	onClose: VoidFunction;
	ref: RefObject<HTMLDivElement | null>;
	onClickUpdate: VoidFunction;
	onClickDelete: VoidFunction;
	onClickCreateProcess: VoidFunction;
	onClickCreateTask: VoidFunction;
}

export const ContextMenuProcessEditor = ({
	isOpen,
	onClose,
	ref,
	onClickUpdate,
	onClickDelete,
	onClickCreateProcess,
	onClickCreateTask,
}: ContextMenuProcessEditorProps) => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const process = useAppSelector(processSelections.selectedProcessEditor);

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
		onClickUpdate();
	};

	const onDeleteProcess = () => {
		if (!process) return;

		dispatch(processActions.setDeleteProcessId(process.id));
		dispatch(processActions.setIsActiveDeleteModal(true));
		onClickDelete();
	};

	const onOpenView = () => {
		if (!process) return;

		dispatch(processActions.setViewProcessData(process));
		dispatch(processActions.setIsActiveViewModal(true));
	};

	const onCreateProcess = () => {
		if (!process) return;

		dispatch(processActions.setCreateProcessData({
			parentId: process.id,
		}));
		dispatch(processActions.setIsActiveCreateModal(true));
		onClickCreateProcess();
	};

	const onCreateTask = () => {
		if (!process) return;

		dispatch(taskActions.setCreateData({
			processId: process.id,
		}));
		dispatch(taskActions.setIsActiveCreateModal(true));
		onClickCreateTask();
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
				{
					label: 'Открыть',
					onClick: onOpenView,
					icon: <SmartIcon iconName={'info'}/>,
				},
				{
					label: 'Документация',
					onClick: onOpenDocumentation,
					icon: <SmartIcon iconName={'folder'}/>,
				},
				{
					label: 'Редактировать',
					onClick: onUpdateProcess,
					icon: <SmartIcon iconName={'edit'}/>,
				},
				{
					label: 'Создать процесс',
					onClick: onCreateProcess,
					icon: <SmartIcon iconName={'create'}/>,
				},
				{
					label: 'Создать задачу',
					onClick: onCreateTask,
					icon: <SmartIcon iconName={'human'}/>,
				},
				{
					label: 'Удалить',
					onClick: onDeleteProcess,
					icon: <SmartIcon iconName={'trash'}/>,
				},
			]}
		/>
	);
};
