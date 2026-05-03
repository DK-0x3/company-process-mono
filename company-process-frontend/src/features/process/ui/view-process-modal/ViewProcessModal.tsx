import { canViewEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { employeeAPI } from '@entities/employee/api/api';
import { ViewMaterialModal } from '@features/material/ui/view-material-modal/ViewMaterialModal';
import { positionAPI } from '@entities/position/api/api';
import { processAPI } from '@entities/process/api/api';
import { processActions, processSelections } from '@entities/process/model/slice';
import { taskActions } from '@entities/task/model/slice';
import { Task } from '@entities/task/model/types/Task';
import { skipToken } from '@reduxjs/toolkit/query';
import routes from '@shared/config/routes';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Modal } from '@shared/ui/modal/ui/Modal';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './ViewProcessModal.module.scss';

export const ViewProcessModal = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const authUser = useAppSelector(selectAuthUser);
	const canViewPositions = canViewEntity(authUser, 'positions');
	const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);
	
	const isActive = useAppSelector(processSelections.IsActiveViewModal);
	const viewProcessData = useAppSelector(processSelections.viewProcessData);

	const processId = viewProcessData?.id;
	const [generatePdf, { isLoading: isGeneratingPdf }] = processAPI.useGeneratePdfMutation();
	const { data: processById } = processAPI.useGetByIdQuery(
		processId ? { id: processId } : skipToken,
		{
			refetchOnMountOrArgChange: true,
		}
	);
	const process = processById ?? viewProcessData;

	const { data: parentProcess } = processAPI.useGetByIdQuery(
		process?.parentId ? { id: process.parentId } : skipToken,
	);
	const { data: validateData } = processAPI.useValidateQuery(
		processId ? { id: processId } : skipToken,
	);
	const { data: descriptionData } = processAPI.useGetDescriptionQuery(
		processId ? { id: processId } : skipToken,
	);
	const { data: passportData } = processAPI.useGetPassportQuery(
		processId ? { id: processId } : skipToken,
	);
	const { data: subtreeData } = processAPI.useGetChildrenProcessByIdQuery(
		processId ? { id: processId } : skipToken,
	);
	const { data: employees } = employeeAPI.useGetAllQuery(undefined, {
		skip: authUser?.actorType === 'EMPLOYEE',
	});
	const { data: positions } = positionAPI.useGetAllQuery(undefined, {
		skip: !canViewPositions,
	});

	const responsiblePositionId = process?.responsiblePositionId
		?? process?.employee?.positionId
		?? undefined;

	const responsiblePositionName = useMemo(() => {
		if (!process) return '-';
		if (process.responsiblePosition?.name) {
			return process.responsiblePosition.name;
		}
		if (!responsiblePositionId) return '-';
		return positions?.find((position) => position.id === responsiblePositionId)?.name ?? '-';
	}, [positions, process, responsiblePositionId]);

	const responsibleEmployees = useMemo(() => {
		if (!responsiblePositionId) return [];
		return (employees ?? []).filter((employee) => {
			const positionId = employee.positionId ?? employee.position?.id;
			return positionId === responsiblePositionId;
		});
	}, [employees, responsiblePositionId]);

	const inputs = (process?.processData ?? []).filter((item) => item.type === 'input');
	const outputs = (process?.processData ?? []).filter((item) => item.type === 'output');
	const materials = process?.processMaterials ?? [];
	const subprocesses = (subtreeData?.processes ?? []).filter((item) => item.id !== processId);
	const tasks = useMemo(() => {
		if (!processId) return [];

		const fromProcess = process?.tasks ?? [];
		if (fromProcess.length > 0) {
			return fromProcess;
		}

		return (subtreeData?.tasks ?? []).filter((task) => task.processId === processId);
	}, [process?.tasks, processId, subtreeData?.tasks]);
	
	const onClose = () => {
		setActiveMaterialId(null);
		dispatch(processActions.setIsActiveViewModal(false));
		setTimeout(() => {
			dispatch(processActions.setViewProcessData(null));
		}, 500);
	};
	
	const onTaskClick = (task: Task) => {
		dispatch(taskActions.setViewData(task));
		dispatch(taskActions.setIsActiveViewModal(true));
	};

	const onDownloadPdf = async () => {
		if (!processId || !process) return;

		const blob = await generatePdf({
			id: processId,
			companyName: 'ООО "СтартСет"',
		}).unwrap();

		const objectUrl = URL.createObjectURL(blob);
		const link = document.createElement('a');
		const safeName = process.name
			.trim()
			.replace(/[\\/:*?"<>|]+/g, '_')
			.replace(/\s+/g, '_');

		link.href = objectUrl;
		link.download = `${safeName || `process_${processId}`}.pdf`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(objectUrl);
	};

	const onOpenDocumentation = () => {
		if (!processId) return;

		onClose();
		navigate(routes.PROCESS_DOCUMENTATION.replace(':processId', String(processId)));
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			{process ? (
				<>
					<div>
						<label className={styles.label}>Название</label>
						<h3>{process.name}</h3>
					</div>

					<div>
						<label className={styles.label}>Описание</label>
						<h3>{process.description ?? '-'}</h3>
					</div>

					<div>
						<label className={styles.label}>Цель</label>
						<h3>{process.goal ?? '-'}</h3>
					</div>

					<div className={styles.metaGrid}>
						<div>
							<label className={styles.label}>Версия</label>
							<h3>{process.version ?? '-'}</h3>
						</div>

						<div>
							<label className={styles.label}>Статус</label>
							<h3>{process.isActive ? 'Активный' : 'Неактивный'}</h3>
						</div>
					</div>

					<div>
						<label className={styles.label}>Родительский процесс</label>
						<h3>{(process.parentId !== null && parentProcess) ? parentProcess.name : '-'}</h3>
					</div>

					<div>
						<label className={styles.label}>Ответственная должность (RACI)</label>
						<h3>{responsiblePositionName}</h3>
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
						<label className={styles.label}>Материалы процесса</label>
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
						<label className={styles.label}>Подпроцессы</label>
						<div className={styles.list}>
							{subprocesses.length > 0 ? subprocesses.map((subprocess) => (
								<div className={styles.listItem} key={subprocess.id}>
									<div className={styles.mainText}>{subprocess.name}</div>
									<div className={styles.subText}>ID: {subprocess.id}</div>
								</div>
							)) : <span>-</span>}
						</div>
					</div>

					<div>
						<label className={styles.label}>Участники (паспорт процесса)</label>
						<div className={styles.list}>
							{passportData && passportData.participants.length > 0 ? passportData.participants.map((participant, index) => (
								<div className={styles.listItem} key={`${participant.name}-${index}`}>
									<div className={styles.mainText}>{participant.name}</div>
									<div className={styles.subText}>
										сотрудники: {participant.employees && participant.employees.length > 0
											? participant.employees.map((employee) => employee.fullName).join(', ')
											: 'не назначены'}
									</div>
								</div>
							)) : <span>-</span>}
						</div>
					</div>

					<div>
						<label className={styles.label}>Текстовое описание процесса</label>
						<div className={styles.preformattedCard}>
							{descriptionData?.text ?? 'Описание формируется...'}
						</div>
					</div>

					<div>
						<label className={styles.label}>Проверка схемы</label>
						<div className={styles.list}>
							{validateData ? (
								<>
									<div className={styles.listItem}>
										<div className={styles.mainText}>
											Статус: <span className={validateData.isValid ? styles.statusOk : styles.statusBad}>
												{validateData.isValid ? 'валидна' : 'есть ошибки'}
											</span>
										</div>
										<div className={styles.subText}>
											Задач: {validateData.stats.tasksCount}, стрелок: {validateData.stats.arrowsCount}
										</div>
									</div>
									<div className={styles.listItem}>
										<div className={styles.subText}>Start: {validateData.checks.hasStart ? 'ok' : 'нет'}</div>
										<div className={styles.subText}>End: {validateData.checks.hasEnd ? 'ok' : 'нет'}</div>
										<div className={styles.subText}>Связность: {validateData.checks.allTasksConnected ? 'ok' : 'ошибка'}</div>
										<div className={styles.subText}>Висящие задачи: {validateData.checks.noHangingTasks ? 'нет' : 'есть'}</div>
										<div className={styles.subText}>Циклы без выхода: {validateData.checks.noCyclesWithoutExit ? 'нет' : 'есть'}</div>
										<div className={styles.subText}>Ответственная должность у задач: {validateData.checks.allTasksHaveResponsiblePosition ? 'ok' : 'не у всех'}</div>
									</div>
								</>
							) : <span>Загрузка проверки...</span>}
						</div>
					</div>

					<span className={styles.label}>Задачи</span>
					<div className={styles.containerTask}>
						{tasks.length > 0 ? (
							tasks.map((task) => (
								<div key={task.id} className={styles.task} onClick={() => onTaskClick(task)}>
									<div className={styles.mainText}>{task.name}</div>
									<div className={styles.subText}>
										тип: {task.type ?? 'task'}
										{task.responsiblePosition?.name ? ` · должность: ${task.responsiblePosition.name}` : ''}
									</div>
								</div>
							))
						) : (
							<span>-</span>
						)}
					</div>

					<div className={styles.actions}>
						<button
							className={styles.documentationButton}
							onClick={onOpenDocumentation}
						>
							Экран документации
						</button>
						<button
							className={styles.downloadButton}
							onClick={onDownloadPdf}
							disabled={isGeneratingPdf}
						>
							{isGeneratingPdf ? 'Формирование PDF...' : 'Скачать PDF'}
						</button>
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
