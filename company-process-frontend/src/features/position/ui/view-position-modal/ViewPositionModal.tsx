import { positionAPI } from '@entities/position/api/api';
import { positionActions, positionSelectors } from '@entities/position/model/slice';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Modal } from '@shared/ui/modal/ui/Modal';

import styles from './ViewPositionModal.module.scss';

const formatDate = (value?: Date | string) => {
	if (!value) return '-';

	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '-';

	return date.toLocaleDateString('ru-RU', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
};

export const ViewPositionModal = () => {
	const dispatch = useAppDispatch();

	const isActive = useAppSelector(positionSelectors.isActiveViewModal);
	const viewPositionData = useAppSelector(positionSelectors.viewData);

	const { data: positionById } = positionAPI.useGetByIdQuery(
		viewPositionData?.id ? { id: viewPositionData.id } : skipToken,
	);

	const position = positionById ?? viewPositionData;
	const employees = position?.employees ?? [];
	const responsibleProcesses = position?.responsibleProcesses ?? [];
	const responsibleTasks = position?.responsibleTasks ?? [];

	const onClose = () => {
		dispatch(positionActions.setIsActiveViewModal(false));
		setTimeout(() => {
			dispatch(positionActions.setViewData(null));
		}, 500);
	};

	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			{position ? (
				<>
					<h2>Должность</h2>

					<div className={styles.metaGrid}>
						<div>
							<label className={styles.label}>Название</label>
							<h3>{position.name}</h3>
						</div>

						<div>
							<label className={styles.label}>Сотрудников</label>
							<h3>{employees.length}</h3>
						</div>

						<div>
							<label className={styles.label}>Ответственная за процессы</label>
							<h3>{responsibleProcesses.length}</h3>
						</div>

						<div>
							<label className={styles.label}>Ответственная за задачи</label>
							<h3>{responsibleTasks.length}</h3>
						</div>

						<div>
							<label className={styles.label}>Создана</label>
							<h3>{formatDate(position.createdAt)}</h3>
						</div>

						<div>
							<label className={styles.label}>Обновлена</label>
							<h3>{formatDate(position.updatedAt)}</h3>
						</div>
					</div>

					<div>
						<label className={styles.label}>Сотрудники этой должности</label>
						<div className={styles.list}>
							{employees.length > 0 ? employees.map((employee) => (
								<div className={styles.listItem} key={employee.id}>
									<div className={styles.mainText}>{employee.fullName}</div>
									<div className={styles.subText}>
										{employee.email}
										{employee.role?.name ? ` · роль: ${employee.role.name}` : ''}
									</div>
								</div>
							)) : <span>-</span>}
						</div>
					</div>

					<div>
						<label className={styles.label}>Процессы, где должность ответственная</label>
						<div className={styles.list}>
							{responsibleProcesses.length > 0 ? responsibleProcesses.map((process) => (
								<div className={styles.listItem} key={process.id}>
									<div className={styles.mainText}>{process.name}</div>
									<div className={styles.subText}>
										ID: {process.id}
										{process.version !== undefined ? ` · версия ${process.version}` : ''}
										{process.isActive !== undefined ? ` · ${process.isActive ? 'активный' : 'неактивный'}` : ''}
									</div>
								</div>
							)) : <span>-</span>}
						</div>
					</div>

					<div>
						<label className={styles.label}>Задачи, где должность ответственная</label>
						<div className={styles.list}>
							{responsibleTasks.length > 0 ? responsibleTasks.map((task) => (
								<div className={styles.listItem} key={task.id}>
									<div className={styles.mainText}>{task.name}</div>
									<div className={styles.subText}>
										ID: {task.id}
										{task.type ? ` · тип: ${task.type}` : ''}
										{task.processId ? ` · процесс: ${task.processId}` : ''}
									</div>
								</div>
							)) : <span>-</span>}
						</div>
					</div>
				</>
			) : (
				<div>Загрузка...</div>
			)}
		</Modal>
	);
};
