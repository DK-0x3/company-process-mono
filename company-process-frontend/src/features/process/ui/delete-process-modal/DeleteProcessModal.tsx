import { processAPI } from '@entities/process/api/api';
import { processActions, processSelections } from '@entities/process/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Modal } from '@shared/ui/modal/ui/Modal';

import styles from './DeleteProcessModal.module.scss';

export const DeleteProcessModal = () => {
	const dispatch = useAppDispatch();
	
	const isActive = useAppSelector(processSelections.IsActiveDeleteModal);
	const deleteProcessId = useAppSelector(processSelections.deleteProcessId);
	const deleteProcessListener = useAppSelector(processSelections.onlyDeleteFirstListener);

	const { data: childProcesses } = processAPI.useGetChildrenProcessByIdQuery(
		{ id: deleteProcessId! },
		{ skip: !deleteProcessId }
	);
	const childProcessItems = childProcesses?.processes ?? [];

	const { data: process } = processAPI.useGetByIdQuery(
		{ id: deleteProcessId! },
		{ skip: !deleteProcessId }
	);
	
	const [deleteProcess] = processAPI.useDeleteMutation();
	
	const onClose = ()=> {
		dispatch(processActions.setIsActiveDeleteModal(false));
	};
	
	const onDelete = async () => {
		if (!deleteProcessId) return;

		const { data: deletedProcess } = await deleteProcess({
			id: deleteProcessId,
		});

		if (deleteProcessListener && deletedProcess) {
			deleteProcessListener(deletedProcess);
			dispatch(processActions.setOnlyUpdateProcessListener(null));
		}

		onClose();
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			<h2>Удаление процесса</h2>

			<label className={styles.nameProcess}>{process?.name}</label>

			{
				childProcessItems.length > 0 && (
					<>
						<p>Также будут удалены следующие процессы:</p>

						<div className={styles.childProcesses}>
							{childProcessItems.map((process) => (
								<span key={process.id} className={styles.card}>
									{process.name}
								</span>
							))}
						</div>
					</>
				)
			}

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
