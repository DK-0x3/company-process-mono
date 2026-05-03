import { canViewEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { employeeAPI } from '@entities/employee/api/api';
import { ViewMaterialModal } from '@features/material/ui/view-material-modal/ViewMaterialModal';
import { positionAPI } from '@entities/position/api/api';
import { processAPI } from '@entities/process/api/api';
import { schemeApi } from '@entities/scheme/api/api';
import { taskAPI } from '@entities/task/api/api';
import { Task } from '@entities/task/model/types/Task';
import { taskActions, taskSelections } from '@entities/task/model/slice';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Modal } from '@shared/ui/modal/ui/Modal';
import { useMemo, useState } from 'react';

import styles from './ViewTaskModal.module.scss';

export const ViewTaskModal = () => {
	const dispatch = useAppDispatch();
	const authUser = useAppSelector(selectAuthUser);
	const canViewPositions = canViewEntity(authUser, 'positions');
	const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);

	const isActive = useAppSelector(taskSelections.isActiveViewModal);
	const viewTaskData = useAppSelector(taskSelections.viewData);
	const taskId = viewTaskData?.id;

	const { data: taskById } = taskAPI.useGetByIdQuery(
		taskId ? { id: taskId } : skipToken,
	);
	const { data: taskPassport } = taskAPI.useGetPassportQuery(
		taskId ? { id: taskId } : skipToken,
	);
	const task = taskById ?? viewTaskData;

	const { data: parentProcess } = processAPI.useGetByIdQuery(
		task?.processId ? { id: task.processId } : skipToken,
	);
	const { data: scheme } = schemeApi.useGetSchemeQuery(
		task?.processId ? { ownerProcessId: task.processId } : skipToken,
	);
	const { data: employees } = employeeAPI.useGetAllQuery(undefined, {
		skip: authUser?.actorType === 'EMPLOYEE',
	});
	const { data: positions } = positionAPI.useGetAllQuery(undefined, {
		skip: !canViewPositions,
	});

	const responsiblePositionId = task?.responsiblePositionId
		?? task?.responsibleEmployee?.positionId
		?? undefined;

	const responsiblePositionName = useMemo(() => {
		if (!task) return '-';
		if (task.responsiblePosition?.name) {
			return task.responsiblePosition.name;
		}
		if (!responsiblePositionId) return '-';
		return positions?.find((position) => position.id === responsiblePositionId)?.name ?? '-';
	}, [positions, responsiblePositionId, task]);

	const responsibleEmployees = useMemo(() => {
		if (taskPassport?.responsible.employeesByPosition?.length) {
			return taskPassport.responsible.employeesByPosition;
		}
		if (!responsiblePositionId) return [];
		return (employees ?? []).filter((employee) => {
			const positionId = employee.positionId ?? employee.position?.id;
			return positionId === responsiblePositionId;
		});
	}, [employees, responsiblePositionId, taskPassport?.responsible.employeesByPosition]);

	const previousAndNext = useMemo(() => {
		if (!task || !scheme) {
			return {
				previousTasks: [] as Task[],
				nextTasks: [] as Task[],
			};
		}

		const taskComponentByTaskId = new Map<number, typeof scheme.tasks[number]>();
		const taskComponentById = new Map<number, typeof scheme.tasks[number]>();
		scheme.tasks.forEach((component) => {
			taskComponentByTaskId.set(component.taskId, component);
			taskComponentById.set(component.id, component);
		});

		const currentComponent = taskComponentByTaskId.get(task.id);
		if (!currentComponent) {
			return {
				previousTasks: [] as Task[],
				nextTasks: [] as Task[],
			};
		}

		const prevTaskMap = new Map<number, Task>();
		const nextTaskMap = new Map<number, Task>();

		scheme.arrows.forEach((arrow) => {
			if (arrow.toTaskComponentId === currentComponent.id && arrow.fromTaskComponentId) {
				const prevComponent = taskComponentById.get(arrow.fromTaskComponentId);
				if (prevComponent?.task) {
					prevTaskMap.set(prevComponent.task.id, prevComponent.task);
				}
			}

			if (arrow.fromTaskComponentId === currentComponent.id && arrow.toTaskComponentId) {
				const nextComponent = taskComponentById.get(arrow.toTaskComponentId);
				if (nextComponent?.task) {
					nextTaskMap.set(nextComponent.task.id, nextComponent.task);
				}
			}
		});

		return {
			previousTasks: Array.from(prevTaskMap.values()),
			nextTasks: Array.from(nextTaskMap.values()),
		};
	}, [scheme, task]);

	const inputs = (task?.taskData ?? []).filter((item) => item.type === 'input');
	const outputs = (task?.taskData ?? []).filter((item) => item.type === 'output');
	const materials = task?.taskMaterials ?? [];

	const relatedTaskById = useMemo(() => {
		const map = new Map<number, Task>();
		previousAndNext.previousTasks.forEach((item) => map.set(item.id, item));
		previousAndNext.nextTasks.forEach((item) => map.set(item.id, item));
		return map;
	}, [previousAndNext.nextTasks, previousAndNext.previousTasks]);

	const previousTaskRows = useMemo(() => {
		if (taskPassport && taskPassport.previousTasks.length > 0) {
			return taskPassport.previousTasks.map((item) => ({
				id: item.id,
				name: item.name,
				type: relatedTaskById.get(item.id)?.type ?? null,
			}));
		}

		return previousAndNext.previousTasks.map((item) => ({
			id: item.id,
			name: item.name,
			type: item.type ?? null,
		}));
	}, [previousAndNext.previousTasks, relatedTaskById, taskPassport]);

	const nextTaskRows = useMemo(() => {
		if (taskPassport && taskPassport.nextTasks.length > 0) {
			return taskPassport.nextTasks.map((item) => ({
				id: item.id,
				name: item.name,
				type: relatedTaskById.get(item.id)?.type ?? null,
			}));
		}

		return previousAndNext.nextTasks.map((item) => ({
			id: item.id,
			name: item.name,
			type: item.type ?? null,
		}));
	}, [previousAndNext.nextTasks, relatedTaskById, taskPassport]);

	const onTaskClick = (nextTask: Task) => {
		dispatch(taskActions.setViewData(nextTask));
		dispatch(taskActions.setIsActiveViewModal(true));
	};

	const onTaskClickById = (id: number) => {
		const nextTask = relatedTaskById.get(id);
		if (!nextTask) {
			return;
		}

		onTaskClick(nextTask);
	};

	const onClose = () => {
		setActiveMaterialId(null);
		dispatch(taskActions.setIsActiveViewModal(false));
		setTimeout(() => {
			dispatch(taskActions.setViewData(null));
		}, 500);
	};

	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			{task ? (
				<>
					<div>
						<label className={styles.label}>Название</label>
						<h3>{task.name}</h3>
					</div>

					<div>
						<label className={styles.label}>Описание</label>
						<h3>{task.description || '-'}</h3>
					</div>

					<div className={styles.metaGrid}>
						<div>
							<label className={styles.label}>Тип задачи</label>
							<h3>{task.type ?? 'task'}</h3>
						</div>

						<div>
							<label className={styles.label}>ID задачи</label>
							<h3>{task.id}</h3>
						</div>
					</div>

					<div>
						<label className={styles.label}>Родительский процесс</label>
						<h3>{parentProcess?.name}</h3>
					</div>

					<div>
						<label className={styles.label}>Ответственная должность</label>
						<h3>{responsiblePositionName}</h3>
					</div>

					<div>
						<label className={styles.label}>Ответственность (паспорт)</label>
						<h3>{taskPassport?.responsible.label ?? '-'}</h3>
					</div>

					<div>
						<label className={styles.label}>Сотрудники этой должности</label>
						<div className={styles.list}>
							{responsibleEmployees.length > 0 ? responsibleEmployees.map((employee) => (
								<div className={styles.listItem} key={employee.id}>
									<div className={styles.mainText}>{employee.fullName}</div>
									<div className={styles.subText}>{employee.email}</div>
								</div>
							)) : <span>-</span>}
						</div>
					</div>

					<div>
						<label className={styles.label}>Входные данные</label>
						<div className={styles.chipRow}>
							{inputs.length > 0
								? inputs.map((item) => <span key={item.id} className={styles.chip}>{item.dataObject?.name ?? `ID ${item.dataObjectId}`}</span>)
								: <span>-</span>}
						</div>
					</div>

					<div>
						<label className={styles.label}>Выходные данные</label>
						<div className={styles.chipRow}>
							{outputs.length > 0
								? outputs.map((item) => <span key={item.id} className={styles.chip}>{item.dataObject?.name ?? `ID ${item.dataObjectId}`}</span>)
								: <span>-</span>}
						</div>
					</div>

					<div>
						<label className={styles.label}>Материалы задачи</label>
						<div className={styles.list}>
							{materials.length > 0 ? materials.map((item) => (
								<button
									type="button"
									className={styles.materialListButton}
									key={item.id}
									onClick={() => setActiveMaterialId(item.materialId)}
								>
									<div className={styles.mainText}>{item.material?.name ?? `Материал #${item.materialId}`}</div>
									<div className={styles.subText}>
										{item.material?.categoryId ? `Категория ID: ${item.material.categoryId}` : `ID: ${item.materialId}`}
									</div>
								</button>
							)) : <span>-</span>}
						</div>
					</div>

					<div>
						<label className={styles.label}>Предыдущие задачи</label>
						<div className={styles.list}>
							{previousTaskRows.length > 0 ? previousTaskRows.map((item) => (
								<div
									className={`${styles.listItem} ${relatedTaskById.get(item.id) ? '' : styles.listItemDisabled}`}
									key={item.id}
									onClick={() => onTaskClickById(item.id)}
								>
									<div className={styles.mainText}>{item.name}</div>
									<div className={styles.subText}>ID: {item.id} · тип: {item.type ?? 'неизвестно'}</div>
								</div>
							)) : <span>-</span>}
						</div>
					</div>

					<div>
						<label className={styles.label}>Следующие задачи</label>
						<div className={styles.list}>
							{nextTaskRows.length > 0 ? nextTaskRows.map((item) => (
								<div
									className={`${styles.listItem} ${relatedTaskById.get(item.id) ? '' : styles.listItemDisabled}`}
									key={item.id}
									onClick={() => onTaskClickById(item.id)}
								>
									<div className={styles.mainText}>{item.name}</div>
									<div className={styles.subText}>ID: {item.id} · тип: {item.type ?? 'неизвестно'}</div>
								</div>
							)) : <span>-</span>}
						</div>
					</div>
				</>
			) : (
				<div>Загрузка...</div>
			)}

			<ViewMaterialModal
				isActive={activeMaterialId !== null}
				materialId={activeMaterialId}
				onClose={() => setActiveMaterialId(null)}
			/>
		</Modal>
	);
};
