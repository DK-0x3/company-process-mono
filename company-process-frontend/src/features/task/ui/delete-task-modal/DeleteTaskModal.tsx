import { taskAPI } from '@entities/task/api/api';
import { taskActions, taskSelections } from '@entities/task/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Modal } from '@shared/ui/modal/ui/Modal';

import styles from './DeleteTaskModal.module.scss';

export const DeleteTaskModal = () => {
	const dispatch = useAppDispatch();
	
	const isActive = useAppSelector(taskSelections.isActiveDeleteModal);
	const deleteId = useAppSelector(taskSelections.deleteId);
	const deleteListener = useAppSelector(taskSelections.onlyDeleteFirstListener);

	const { data: task } = taskAPI.useGetByIdQuery(
		{ id: deleteId! },
		{ skip: !deleteId }
	);
	
	const [deleteTask] = taskAPI.useDeleteMutation();
	
	const onClose = ()=> {
		dispatch(taskActions.setIsActiveDeleteModal(false));
	};
	
	const onDelete = async () => {
		if (!deleteId) return;
		
		const { data: deleted } = await deleteTask({
			id: deleteId,
		});

		if (deleteListener && deleted) {
			deleteListener(deleted);
			dispatch(taskActions.setOnlyUpdateTaskListener(null));
		}

		onClose();
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			<h2>Удаление задачи</h2>

			<label className={styles.nameProcess}>{task?.name}</label>

			<div className={styles.buttons}>
				<button
					className={styles.createInput}
					onClick={onClose}
				>
					Отмена
				</button>
				
				<button
					className={styles.createInput}
					onClick={onDelete}
				>
					Удалить
				</button>
			</div>
		</Modal>
	);
};