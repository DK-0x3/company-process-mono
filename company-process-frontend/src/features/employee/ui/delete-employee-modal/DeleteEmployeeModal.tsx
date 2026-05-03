import { employeeAPI } from '@entities/employee/api/api';
import { employeeActions, employeeSelections } from '@entities/employee/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Modal } from '@shared/ui/modal/ui/Modal';

import styles from './DeleteEmployeeModal.module.scss';

export const DeleteEmployeeModal = () => {
	const dispatch = useAppDispatch();
	
	const isActive = useAppSelector(employeeSelections.isActiveDeleteModal);
	const deleteEmployeeId = useAppSelector(employeeSelections.deleteId);
	
	const [deleteEmployee] = employeeAPI.useDeleteMutation();

	const { data: employee } = employeeAPI.useGetByIdQuery(
		{ id: deleteEmployeeId! },
		{ skip: !deleteEmployeeId }
	);
	
	const onClose = ()=> {
		dispatch(employeeActions.setIsActiveDeleteModal(false));
	};
	
	const onDelete = async () => {
		if (!deleteEmployeeId) return;
		
		await deleteEmployee({
			id: deleteEmployeeId,
		});

		onClose();
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			<h2>Удаление сотрудника</h2>

			<label className={styles.nameEmployee}>{employee?.fullName}</label>

			<span className={styles.position}>{employee?.position?.name ?? '-'}</span>

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
