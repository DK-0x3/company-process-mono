import { canEditEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { positionActions } from '@entities/position/model/slice';
import { Position } from '@entities/position/model/types/Position';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { ContextMenu } from '@shared/ui/context-menu/ContextMenu';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { RefObject } from 'react';

interface ContextMenuPositionProps {
	position: Position | null;
	isOpen: boolean;
	onClose: VoidFunction;
	ref: RefObject<HTMLDivElement | null>;
}

export const ContextMenuPosition = ({
	position,
	isOpen,
	onClose,
	ref,
}: ContextMenuPositionProps) => {
	const dispatch = useAppDispatch();
	const authUser = useAppSelector(selectAuthUser);
	const canEditPositions = canEditEntity(authUser, 'positions');

	const onView = () => {
		if (!position) return;

		dispatch(positionActions.setViewData(position));
		dispatch(positionActions.setIsActiveViewModal(true));
	};

	const onUpdate = () => {
		if (!position) return;

		dispatch(positionActions.setUpdateData({
			id: position.id,
			name: position.name,
		}));

		dispatch(positionActions.setIsActiveUpdateModal(true));
	};

	const onDelete = () => {
		if (!position) return;

		dispatch(positionActions.setDeleteData(position));
		dispatch(positionActions.setIsActiveDeleteModal(true));
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
					onClick: onView,
					icon: <SmartIcon iconName={'info'}/>,
				},
				...(canEditPositions ? [{
					label: 'Редактировать',
					onClick: onUpdate,
					icon: <SmartIcon iconName={'edit'}/>,
				}] : []),
				...(canEditPositions ? [{
					label: 'Удалить',
					onClick: onDelete,
					icon: <SmartIcon iconName={'trash'}/>,
				}] : []),
			]}
		/>
	);
};
