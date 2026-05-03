import { employeeActions, employeeSelections } from '@entities/employee/model/slice';
import { Employee } from '@entities/employee/model/types/Employee';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Modal } from '@shared/ui/modal/ui/Modal';
import classNames from 'classnames';

import styles from './ViewEmployeeModal.module.scss';

const permissionRows: Array<{
	viewKey: keyof Employee;
	editKey: keyof Employee;
	label: string;
}> = [
	{ viewKey: 'canViewProcesses', editKey: 'canEditProcesses', label: 'Процессы' },
	{ viewKey: 'canViewTasks', editKey: 'canEditTasks', label: 'Задачи' },
	{ viewKey: 'canViewPositions', editKey: 'canEditPositions', label: 'Должности' },
	{ viewKey: 'canViewDataObjects', editKey: 'canEditDataObjects', label: 'Объекты данных' },
	{ viewKey: 'canViewMaterials', editKey: 'canEditMaterials', label: 'Материалы' },
	{ viewKey: 'canViewTests', editKey: 'canEditTests', label: 'Тесты' },
];

export const ViewEmployeeModal = () => {
	const dispatch = useAppDispatch();
	
	const isActive = useAppSelector(employeeSelections.isActiveViewModal);
	const viewEmployeeData = useAppSelector(employeeSelections.viewData);

	const onClose = () => {
		dispatch(employeeActions.setIsActiveViewModal(false));
		setTimeout(() => {
			dispatch(employeeActions.setViewData(null));
		}, 500);
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			{viewEmployeeData ? (<div className={styles.content}>
				<div className={styles.mainGrid}>
					<div>
						<label>ФИО</label>
						<span>{viewEmployeeData.fullName}</span>
					</div>

					<div>
						<label>Почта</label>
						<span>{viewEmployeeData.email}</span>
					</div>

					<div>
						<label>Телефон</label>
						<span>{viewEmployeeData.phone || '-'}</span>
					</div>

					<div>
						<label>Адрес</label>
						<span>{viewEmployeeData.address || '-'}</span>
					</div>

					<div className={styles.positionContainer}>
						<label>Должность</label>
						<span>{viewEmployeeData.position?.name || '-'}</span>
					</div>

					<div className={styles.dateContainer}>
						<label>Дата рождения</label>
						<span>{viewEmployeeData.birthDate.toLocaleDateString('ru-RU', {
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						})}</span>
					</div>

					<div className={classNames(styles.dateContainer, styles.hireDateContainer)}>
						<label>Дата трудоустройства</label>
						<span>{viewEmployeeData.hireDate.toLocaleDateString('ru-RU', {
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						})}</span>
					</div>

					<div>
						<label>Логин ЛК</label>
						<span>{viewEmployeeData.userAccount?.login ?? '-'}</span>
					</div>

					<div>
						<label>Пароль ЛК</label>
						<span>{viewEmployeeData.userAccount?.visiblePassword ?? '-'}</span>
					</div>
				</div>

				<div className={styles.permissionsSection}>
					<h3>Права доступа</h3>
					<div className={styles.permissionsHeader}>
						<span>Сущность</span>
						<span>Просмотр</span>
						<span>Редактирование</span>
					</div>

					<div className={styles.permissionsTable}>
						{permissionRows.map((row) => {
							const canView = Boolean(viewEmployeeData[row.viewKey]);
							const canEdit = Boolean(viewEmployeeData[row.editKey]);

							return (
								<div key={String(row.viewKey)} className={styles.permissionsRow}>
									<span className={styles.permissionEntity}>{row.label}</span>
									<span className={classNames(styles.permissionBadge, canView ? styles.badgeOk : styles.badgeOff)}>
										{canView ? 'Да' : 'Нет'}
									</span>
									<span className={classNames(styles.permissionBadge, canEdit ? styles.badgeOk : styles.badgeOff)}>
										{canEdit ? 'Да' : 'Нет'}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</div>)
				: <span>Загрузка...</span>
			}
		</Modal>
	);
};
