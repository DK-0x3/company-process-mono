import { cabinetAPI } from '@entities/cabinet/api/api';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { ViewMaterialModal } from '@features/material/ui/view-material-modal/ViewMaterialModal';
import routes from '@shared/config/routes';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Modal } from '@shared/ui/modal/ui/Modal';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './EmployeeCabinetPage.module.scss';

const formatDate = (value: string) =>
	new Date(value).toLocaleDateString('ru-RU', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

const typeMap: Record<string, string> = {
	start: 'Старт',
	end: 'Завершение',
	task: 'Задача',
	decision: 'Решение',
	parallel: 'Параллельная ветка',
};

export const EmployeeCabinetPage = () => {
	const navigate = useNavigate();
	const user = useAppSelector(selectAuthUser);
	const isEmployee = user?.actorType === 'EMPLOYEE';
	const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
	const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
	const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
	const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
	const [activeMaterial, setActiveMaterial] = useState<{
		id: number;
		name: string;
		content: string;
		category: { id: number; name: string } | null;
		updatedAt: string;
	} | null>(null);

	const {
		data,
		isLoading,
		error,
	} = cabinetAPI.useGetMeQuery(undefined, {
		skip: !isEmployee,
	});

	const canViewProcesses = Boolean(
		data?.permissions?.canViewProcesses || data?.permissions?.canEditProcesses
	);
	const canViewTasks = Boolean(
		data?.permissions?.canViewTasks || data?.permissions?.canEditTasks
	);
	const canViewMaterials = Boolean(
		data?.permissions?.canViewMaterials || data?.permissions?.canEditMaterials
	);
	const canViewDataObjects = Boolean(
		data?.permissions?.canViewDataObjects || data?.permissions?.canEditDataObjects
	);

	const {
		data: selectedProcessDetails,
		isLoading: isLoadingProcessDetails,
	} = cabinetAPI.useGetProcessDetailsQuery(selectedProcessId as number, {
		skip: !selectedProcessId || !canViewProcesses,
	});

	const {
		data: selectedTaskDetails,
		isLoading: isLoadingTaskDetails,
	} = cabinetAPI.useGetTaskDetailsQuery(selectedTaskId as number, {
		skip: !selectedTaskId || !canViewTasks,
	});

	const sortedTasks = useMemo(
		() => [...(data?.tasks ?? [])].sort((a, b) => a.processName.localeCompare(b.processName, 'ru')),
		[data?.tasks]
	);

	const taskLookupById = useMemo(
		() => new Map((data?.tasks ?? []).map((task) => [task.id, task])),
		[data?.tasks],
	);

	useEffect(() => {
		if (!data) return;

		if (canViewProcesses && !selectedProcessId && data.processes.length > 0) {
			setSelectedProcessId(data.processes[0].id);
		}

		if (canViewTasks && !selectedTaskId && data.tasks.length > 0) {
			setSelectedTaskId(data.tasks[0].id);
		}
	}, [canViewProcesses, canViewTasks, data, selectedProcessId, selectedTaskId]);

	if (!isEmployee) {
		return (
			<div className={styles.wrapper}>
				<div className={styles.errorCard}>
					Личный кабинет сотрудника доступен только для employee-аккаунта.
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className={styles.wrapper}>
				<div className={styles.loading}>Загрузка кабинета...</div>
			</div>
		);
	}

	if (!data || error) {
		return (
			<div className={styles.wrapper}>
				<div className={styles.errorCard}>
					Не удалось загрузить данные кабинета. Обратитесь к администратору.
				</div>
			</div>
		);
	}

	const onOpenProcess = (processId: number) => {
		setSelectedProcessId(processId);
		setIsProcessModalOpen(true);
	};

	const onOpenTask = (taskId: number) => {
		setSelectedTaskId(taskId);
		setIsTaskModalOpen(true);
	};

	return (
		<div className={styles.wrapper}>
			<div className={styles.hero}>
				<div>
					<h1 className={styles.title}>Личный кабинет</h1>
					<p className={styles.subtitle}>
						Просмотр ваших процессов, задач и назначений. Редактирование отключено.
					</p>
				</div>
				<div className={styles.heroMetrics}>
					<div className={styles.metric}>
						<span className={styles.metricLabel}>Процессы</span>
						<span className={styles.metricValue}>{data.summary.responsibleProcesses}</span>
					</div>
					<div className={styles.metric}>
						<span className={styles.metricLabel}>Задачи</span>
						<span className={styles.metricValue}>{data.summary.responsibleTasks}</span>
					</div>
				</div>
			</div>

			<section className={styles.card}>
				<h3 className={styles.sectionTitle}>Доступные разделы</h3>
				<div className={styles.tags}>
					{canViewProcesses && (
						<button className={styles.detailsButton} onClick={() => navigate(routes.HOME)}>
							Процессы и задачи {data.permissions.canEditProcesses || data.permissions.canEditTasks ? '(редактирование доступно)' : '(только просмотр)'}
						</button>
					)}
					{(data.permissions.canViewPositions || data.permissions.canEditPositions) && (
						<button className={styles.detailsButton} onClick={() => navigate(routes.POSITION)}>
							Должности {data.permissions.canEditPositions ? '(редактирование доступно)' : '(только просмотр)'}
						</button>
					)}
					{(data.permissions.canViewDataObjects || data.permissions.canEditDataObjects) && (
						<button className={styles.detailsButton} onClick={() => navigate(routes.DATA_OBJECT)}>
							Объекты данных {data.permissions.canEditDataObjects ? '(редактирование доступно)' : '(только просмотр)'}
						</button>
					)}
					{(data.permissions.canViewMaterials || data.permissions.canEditMaterials) && (
						<button className={styles.detailsButton} onClick={() => navigate(routes.MATERIAL)}>
							Материалы {data.permissions.canEditMaterials ? '(редактирование доступно)' : '(только просмотр)'}
						</button>
					)}
					{(data.permissions.canViewTests || data.permissions.canEditTests) && (
						<button className={styles.detailsButton} onClick={() => navigate(routes.CABINET_TESTS)}>
							Мои тесты (прохождение)
						</button>
					)}
					{data.permissions.canEditTests && (
						<button className={styles.detailsButton} onClick={() => navigate(routes.TEST)}>
							Управление тестами
						</button>
					)}
					{!data.permissions.canViewProcesses
						&& !data.permissions.canEditProcesses
						&& !data.permissions.canViewPositions
						&& !data.permissions.canEditPositions
						&& !data.permissions.canViewDataObjects
						&& !data.permissions.canEditDataObjects
						&& !data.permissions.canViewMaterials
						&& !data.permissions.canEditMaterials
						&& !data.permissions.canViewTests
						&& !data.permissions.canEditTests && (
						<div className={styles.empty}>Пока нет выданных прав на разделы.</div>
					)}
				</div>
			</section>

			<div className={styles.grid}>
				<section className={styles.card}>
					<h3 className={styles.sectionTitle}>Профиль сотрудника</h3>
					<div className={styles.infoList}>
						<div><span>ФИО:</span> {data.employee.fullName}</div>
						<div><span>Email:</span> {data.employee.email}</div>
						<div><span>Телефон:</span> {data.employee.phone ?? '—'}</div>
						<div><span>Должность:</span> {data.employee.position?.name ?? '—'}</div>
						<div><span>Роль:</span> {data.employee.role?.name ?? '—'}</div>
						<div><span>Дата рождения:</span> {formatDate(data.employee.birthDate)}</div>
						<div><span>Дата найма:</span> {formatDate(data.employee.hireDate)}</div>
						<div><span>Адрес:</span> {data.employee.address ?? '—'}</div>
					</div>
				</section>

				<section className={styles.card}>
					<h3 className={styles.sectionTitle}>Назначенные процессы</h3>
					<div className={styles.list}>
						{!canViewProcesses && (
							<div className={styles.empty}>Нет прав на просмотр процессов</div>
						)}
						{canViewProcesses && data.processes.length === 0 && (
							<div className={styles.empty}>Нет назначенных процессов</div>
						)}
						{canViewProcesses && data.processes.map((process) => (
							<button
								key={process.id}
								className={`${styles.listItem} ${selectedProcessId === process.id ? styles.listItemActive : ''}`}
								onClick={() => onOpenProcess(process.id)}
							>
								<div className={styles.itemTitle}>{process.name}</div>
								<div className={styles.itemSub}>{process.description ?? 'Без описания'}</div>
								<div className={styles.tags}>
									<span>v{process.version}</span>
									<span>{process.isActive ? 'Активен' : 'Неактивен'}</span>
									<span>{process.responsible}</span>
								</div>
								<div className={styles.itemAction}>Открыть процесс</div>
							</button>
						))}
					</div>
				</section>
			</div>

			<section className={styles.card}>
				<h3 className={styles.sectionTitle}>Назначенные задачи</h3>
				{!canViewTasks ? (
					<div className={styles.empty}>Нет прав на просмотр задач</div>
				) : (
					<div className={styles.tableContainer}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Задача</th>
								<th>Тип</th>
								<th>Процесс</th>
								<th>Ответственность</th>
								<th>Обновлена</th>
								<th>Детали</th>
							</tr>
						</thead>
						<tbody>
							{sortedTasks.length === 0 && (
								<tr>
									<td colSpan={6} className={styles.emptyRow}>Нет назначенных задач</td>
								</tr>
							)}
							{sortedTasks.map((task) => (
								<tr key={task.id} className={selectedTaskId === task.id ? styles.selectedRow : ''}>
									<td>
										<div className={styles.itemTitle}>{task.name}</div>
										<div className={styles.itemSub}>{task.description ?? 'Без описания'}</div>
									</td>
									<td>{typeMap[task.type] ?? task.type}</td>
									<td>{task.processName}</td>
									<td>{task.responsible}</td>
									<td>{formatDate(task.updatedAt)}</td>
									<td>
										<button
											className={styles.detailsButton}
											onClick={() => onOpenTask(task.id)}
										>
											Подробнее
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					</div>
				)}
			</section>

			<Modal
				isActive={isProcessModalOpen}
				onClose={setIsProcessModalOpen}
				contentClassName={styles.detailsModal}
			>
				<h3 className={styles.sectionTitle}>Просмотр процесса</h3>
				{!canViewProcesses && <div className={styles.empty}>Нет прав на просмотр процессов</div>}
				{isLoadingProcessDetails && <div className={styles.empty}>Загрузка деталей процесса...</div>}
				{canViewProcesses && !isLoadingProcessDetails && !selectedProcessDetails && (
					<div className={styles.empty}>Данные процесса не найдены</div>
				)}
				{canViewProcesses && selectedProcessDetails && (
					<div className={styles.detailBlock}>
						<div className={styles.itemTitle}>{selectedProcessDetails.name}</div>
						<div className={styles.itemSub}>{selectedProcessDetails.description ?? 'Без описания'}</div>
						<div className={styles.instruction}>Цель: {selectedProcessDetails.goal ?? 'не задана'}</div>
						<div className={styles.instruction}>Ответственный контур: {selectedProcessDetails.responsible}</div>
						<div className={styles.instruction}>Версия: {selectedProcessDetails.version}</div>

						<div className={styles.flowSection}>
							<div className={styles.flowTitle}>Входы процесса</div>
							{!canViewDataObjects && <span className={styles.chip}>Нет прав на просмотр объектов данных</span>}
							{selectedProcessDetails.inputs.length === 0 && <span className={styles.chip}>Не указаны</span>}
							{selectedProcessDetails.inputs.map((input) => (
								<span key={input.id} className={styles.chip}>{input.name}</span>
							))}
						</div>

						<div className={styles.flowSection}>
							<div className={styles.flowTitle}>Выходы процесса</div>
							{!canViewDataObjects && <span className={styles.chip}>Нет прав на просмотр объектов данных</span>}
							{selectedProcessDetails.outputs.length === 0 && <span className={styles.chip}>Не указаны</span>}
							{selectedProcessDetails.outputs.map((output) => (
								<span key={output.id} className={styles.chip}>{output.name}</span>
							))}
						</div>

						<div className={styles.flowSection}>
							<div className={styles.flowTitle}>Материалы процесса</div>
							{!canViewMaterials && <span className={styles.chip}>Нет прав на просмотр материалов</span>}
							{selectedProcessDetails.materials.length === 0 && <span className={styles.chip}>Нет материалов</span>}
							{selectedProcessDetails.materials.map((material) => (
								<button
									type="button"
									key={material.id}
									className={styles.materialButton}
									onClick={() => setActiveMaterial(material)}
								>
									{material.name}
								</button>
							))}
						</div>

						<div className={styles.flowSection}>
							<div className={styles.flowTitle}>Шаги процесса</div>
							{!canViewTasks && <span className={styles.chip}>Нет прав на просмотр задач</span>}
							{selectedProcessDetails.tasks.map((task) => (
								<div key={task.id} className={styles.stepRow}>
									<div>
										<span>{typeMap[task.type] ?? task.type}:</span> {task.name}
									</div>
									<button
										type="button"
										className={styles.inlineAction}
										onClick={() => onOpenTask(task.id)}
									>
										Открыть задачу
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</Modal>

			<Modal
				isActive={isTaskModalOpen}
				onClose={setIsTaskModalOpen}
				contentClassName={styles.detailsModal}
			>
				<h3 className={styles.sectionTitle}>Просмотр задачи</h3>
				{!canViewTasks && <div className={styles.empty}>Нет прав на просмотр задач</div>}
				{isLoadingTaskDetails && <div className={styles.empty}>Загрузка деталей задачи...</div>}
				{canViewTasks && !isLoadingTaskDetails && !selectedTaskDetails && (
					<div className={styles.empty}>Данные задачи не найдены</div>
				)}
				{canViewTasks && selectedTaskDetails && (
					<div className={styles.detailBlock}>
						<div className={styles.itemTitle}>{selectedTaskDetails.name}</div>
						<div className={styles.itemSub}>{selectedTaskDetails.description ?? 'Без описания'}</div>
						<div className={styles.instruction}>Процесс: {selectedTaskDetails.process.name}</div>
						<div className={styles.instruction}>
							Тип: {typeMap[selectedTaskDetails.type] ?? selectedTaskDetails.type}
						</div>
						<div className={styles.instruction}>Ответственность: {selectedTaskDetails.responsible}</div>

						<div className={styles.flowSection}>
							<div className={styles.flowTitle}>Что нужно получить на вход</div>
							{!canViewDataObjects && <span className={styles.chip}>Нет прав на просмотр объектов данных</span>}
							{selectedTaskDetails.inputs.length === 0 && <span className={styles.chip}>Не указано</span>}
							{selectedTaskDetails.inputs.map((input) => (
								<span key={input.id} className={styles.chip}>{input.name}</span>
							))}
						</div>

						<div className={styles.flowSection}>
							<div className={styles.flowTitle}>Что должно быть на выходе</div>
							{!canViewDataObjects && <span className={styles.chip}>Нет прав на просмотр объектов данных</span>}
							{selectedTaskDetails.outputs.length === 0 && <span className={styles.chip}>Не указано</span>}
							{selectedTaskDetails.outputs.map((output) => (
								<span key={output.id} className={styles.chip}>{output.name}</span>
							))}
						</div>

						<div className={styles.flowSection}>
							<div className={styles.flowTitle}>Материалы задачи</div>
							{!canViewMaterials && <span className={styles.chip}>Нет прав на просмотр материалов</span>}
							{selectedTaskDetails.materials.length === 0 && <span className={styles.chip}>Нет материалов</span>}
							{selectedTaskDetails.materials.map((material) => (
								<button
									type="button"
									key={material.id}
									className={styles.materialButton}
									onClick={() => setActiveMaterial(material)}
								>
									{material.name}
								</button>
							))}
						</div>

						<div className={styles.flowSection}>
							<div className={styles.flowTitle}>Предыдущие задачи</div>
							{selectedTaskDetails.previousTasks.length === 0 && <span className={styles.chip}>Нет</span>}
							{selectedTaskDetails.previousTasks.map((task) => (
								<button
									type="button"
									key={task.id}
									className={styles.materialButton}
									onClick={() => {
										if (taskLookupById.has(task.id)) {
											onOpenTask(task.id);
										}
									}}
								>
									{task.name}
								</button>
							))}
						</div>

						<div className={styles.flowSection}>
							<div className={styles.flowTitle}>Следующие задачи</div>
							{selectedTaskDetails.nextTasks.length === 0 && <span className={styles.chip}>Нет</span>}
							{selectedTaskDetails.nextTasks.map((task) => (
								<button
									type="button"
									key={task.id}
									className={styles.materialButton}
									onClick={() => {
										if (taskLookupById.has(task.id)) {
											onOpenTask(task.id);
										}
									}}
								>
									{task.name}
								</button>
							))}
						</div>
					</div>
				)}
			</Modal>

			<ViewMaterialModal
				isActive={activeMaterial !== null}
				materialId={activeMaterial?.id ?? null}
				materialData={activeMaterial}
				onClose={() => setActiveMaterial(null)}
			/>
		</div>
	);
};
