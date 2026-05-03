import { positionAPI } from '@entities/position/api/api';
import { positionActions, positionSelectors } from '@entities/position/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Modal } from '@shared/ui/modal/ui/Modal';

import styles from './DeletePositionModal.module.scss';

export const DeletePositionModal = () => {
	const dispatch = useAppDispatch();
	
	const isActive = useAppSelector(positionSelectors.isActiveDeleteModal);
	const position = useAppSelector(positionSelectors.deleteData);
	
	const [deletePosition] = positionAPI.useDeleteMutation();
	
	const onClose = ()=> {
		dispatch(positionActions.setIsActiveDeleteModal(false));
	};
	
	const onDelete = async () => {
		if (!position) return;
		
		await deletePosition({
			id: position.id,
		});

		onClose();
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			<h2>Удаление должности</h2>

			<label className={styles.nameEmployee}>{position?.name}</label>

			<div className={styles.buttons}>
				<button
					onClick={onClose}
				>
					Отмена
				</button>
				
				<button
					className={styles.delete}
					onClick={onDelete}
				>
					Удалить
				</button>
			</div>
		</Modal>
	);
};