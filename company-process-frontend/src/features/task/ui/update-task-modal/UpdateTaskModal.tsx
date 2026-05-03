import { dataObjectAPI } from '@entities/data-object/api/api';
import { materialAPI } from '@entities/material/api/api';
import { positionAPI } from '@entities/position/api/api';
import { Position } from '@entities/position/model/types/Position';
import { DataFlowType } from '@entities/process-data/api/types';
import { processAPI } from '@entities/process/api/api';
import { taskDataAPI } from '@entities/task-data/api/api';
import { taskAPI } from '@entities/task/api/api';
import { taskActions, taskSelections } from '@entities/task/model/slice';
import { skipToken } from '@reduxjs/toolkit/query';
import { ProcessSelect } from '@features/process/ui/process-select/ProcessSelect';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { DropDownMenu } from '@shared/ui/drop-down-menu/DropDownMenu';
import { MultiSelectDropDown } from '@shared/ui/drop-down-menu/MultiSelectDropDown';
import DropDownMenuItem from '@shared/ui/drop-down-menu/types/DropDownMenuItem';
import { Modal } from '@shared/ui/modal/ui/Modal';
import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'react';

import styles from './UpdateTaskModal.module.scss';

export const UpdateTaskModal = () => {
	const dispatch = useAppDispatch();
	
	const isActive = useAppSelector(taskSelections.isActiveUpdateModal);
	const updateProcessData = useAppSelector(taskSelections.updateData);
	const updateListener = useAppSelector(taskSelections.onlyUpdateFirstListener);
	
	const [isErrorName, setIsErrorName] = useState<boolean>(false);
	const [selectedDataObjectId, setSelectedDataObjectId] = useState<number | null>(null);
	const [selectedDataType, setSelectedDataType] = useState<DataFlowType>('input');
	const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
	const taskId = updateProcessData.id ?? 0;

	const { data: processes } = processAPI.useGetAllFlatQuery();
	const { data: processesTree } = processAPI.useGetAllTreeQuery();
	const { data: positions } = positionAPI.useGetAllQuery();
	const { data: dataObjects } = dataObjectAPI.useGetAllQuery();
	const { data: materials } = materialAPI.useGetAllQuery();
	const { data: taskById } = taskAPI.useGetByIdQuery(
		taskId > 0 ? { id: taskId } : skipToken,
	);
	const { data: taskDataLinks } = taskDataAPI.useGetAllQuery(
		taskId > 0 ? { taskId } : skipToken,
	);
	const [updateTask] = taskAPI.useUpdateMutation();
	const [createTaskData, { isLoading: isCreatingTaskData }] = taskDataAPI.useCreateMutation();
	const [deleteTaskData, { isLoading: isDeletingTaskData }] = taskDataAPI.useDeleteMutation();
	
	const positionMenuItems = useMemo(() => {
		if (!positions) return [];

		const resultMenuItems: DropDownMenuItem<Position>[] = [];

		positions.forEach((position) => {
			resultMenuItems.push({
				label: position.name,
				value: position,
			});
		});

		return resultMenuItems;
	}, [positions]);

	const dataObjectMenuItems = useMemo(() => {
		if (!dataObjects) return [];

		const resultMenuItems: DropDownMenuItem<{ id: number; name: string }>[] = [];
		dataObjects.forEach((dataObject) => {
			resultMenuItems.push({
				label: dataObject.name,
				value: {
					id: dataObject.id,
					name: dataObject.name,
				},
			});
		});

		return resultMenuItems;
	}, [dataObjects]);

	const initialParentProcess = useMemo(() => {
		return processes?.find((item) =>
			item.id === updateProcessData.processId);
	}, [updateProcessData, processes]);

	const initialResponsiblePosition = useMemo(() => {
		return positionMenuItems.find((item) =>
			item.value.id
				=== (updateProcessData.responsiblePositionId
					?? updateProcessData.employeeId));
	}, [updateProcessData, positionMenuItems]);

	useEffect(() => {
		const fromUpdateData = updateProcessData.materialIds ?? [];
		if (fromUpdateData.length > 0) {
			setSelectedMaterialIds(Array.from(new Set(fromUpdateData)));
			return;
		}

		const fromRelations = (taskById?.taskMaterials ?? []).map((item) => item.materialId);
		setSelectedMaterialIds(Array.from(new Set(fromRelations)));
	}, [taskById?.taskMaterials, updateProcessData.id, updateProcessData.materialIds]);

	const onUpdateName = (value: string) => {
		dispatch(taskActions.setUpdateData({
			...updateProcessData,
			name: value,
		}));
	};

	const onUpdateDescription = (value: string) => {
		dispatch(taskActions.setUpdateData({
			...updateProcessData,
			description: value,
		}));
	};

	const onUpdateProcessId = (id: number) => {
		dispatch(taskActions.setUpdateData({
			...updateProcessData,
			processId: id,
		}));
	};

	const onUpdateResponsiblePositionId = (id: number) => {
		dispatch(taskActions.setUpdateData({
			...updateProcessData,
			responsiblePositionId: id,
			employeeId: undefined,
			responsibleEmployeeId: undefined,
		}));
	};

	const onAddTaskData = async () => {
		if (taskId <= 0 || !selectedDataObjectId) return;

		await createTaskData({
			taskId,
			dataObjectId: selectedDataObjectId,
			type: selectedDataType,
		});
	};

	const onDeleteTaskData = async (id: number) => {
		await deleteTaskData({ id });
	};
	
	const onUpdate = async () => {
		if (updateProcessData.name?.trim().length === 0) {
			setIsErrorName(true);
			return;
		}

		const { data: updated } = await updateTask({
			...updateProcessData,
			materialIds: selectedMaterialIds,
		});

		if (updateListener && updated) {
			updateListener(updated);
			dispatch(taskActions.setOnlyUpdateTaskListener(null));
		}

		dispatch(taskActions.setIsActiveUpdateModal(false));
		
		setIsErrorName(false);
		dispatch(taskActions.setUpdateData({
			id: 0,
		}));
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={()=>
				dispatch(taskActions.setIsActiveUpdateModal(false))}
			contentClassName={styles.wrapper}
		>
			<h2>Редактирование задачи</h2>

			<div>
				<label>Название</label>
				<input 
					className={classNames(styles.input, {
						[styles.errorName]: isErrorName
					})}
					value={updateProcessData.name ?? ''}
					onChange={(e) => onUpdateName(e.target.value)}
				/>
			</div>

			<div>
				<label>Описание</label>
				<textarea
					className={styles.input}
					value={updateProcessData.description ?? ''}
					onChange={(e) => onUpdateDescription(e.target.value)}
				></textarea>
			</div>

			<div className={styles.processParentContainer}>
				<label>Родительский раздел</label>
				<ProcessSelect
					processes={processesTree ?? []}
					onSelect={(p) => onUpdateProcessId(p.id)}
					initialValue={initialParentProcess}
				/>
			</div>

			<div className={styles.processParentContainer}>
				<label>Ответственная должность</label>
				<DropDownMenu
					items={positionMenuItems}
					buttonClassName={styles.button}
					isMenuMatchButtonWidth={true}
					label="Выберите должность"
					showSelectedItem={true}
					onSelect={(item) => onUpdateResponsiblePositionId(item.value.id)}
					initialSelectedItem={initialResponsiblePosition}
				/>
			</div>

			<div className={styles.materialSection}>
				<label>Материалы задачи</label>
				<MultiSelectDropDown
					items={(materials ?? []).map((material) => ({
						value: material.id,
						label: material.name,
						description: material.category?.name ?? 'Без категории',
					}))}
					selectedValues={selectedMaterialIds}
					onChange={setSelectedMaterialIds}
					placeholder="Выберите материалы"
					buttonClassName={styles.button}
				/>
			</div>

			<div className={styles.dataSection}>
				<label>Входы/выходы задачи</label>

				<div className={styles.dataControls}>
					<div className={styles.dataControlItem}>
						<DropDownMenu
							items={dataObjectMenuItems}
							buttonClassName={styles.button}
							isMenuMatchButtonWidth={true}
							label="Объект данных"
							showSelectedItem={true}
							onSelect={(item) => setSelectedDataObjectId(item.value.id)}
						/>
					</div>

					<div className={styles.dataControlItem}>
						<DropDownMenu
							items={[
								{
									label: 'Вход',
									value: 'input' as DataFlowType,
								},
								{
									label: 'Выход',
									value: 'output' as DataFlowType,
								},
							]}
							buttonClassName={styles.button}
							isMenuMatchButtonWidth={true}
							label="Тип связи"
							showSelectedItem={true}
							onSelect={(item) => setSelectedDataType(item.value)}
							initialSelectedItem={{
								label: selectedDataType === 'input' ? 'Вход' : 'Выход',
								value: selectedDataType,
							}}
						/>
					</div>

					<button
						className={styles.addDataButton}
						onClick={onAddTaskData}
						disabled={!selectedDataObjectId || isCreatingTaskData}
					>
						{isCreatingTaskData ? 'Добавление...' : 'Добавить'}
					</button>
				</div>

				<div className={styles.dataList}>
					{taskDataLinks && taskDataLinks.length > 0 ? (
						taskDataLinks.map((link) => (
							<div key={link.id} className={styles.dataItem}>
								<div>
									<strong>{link.dataObject?.name ?? `ID ${link.dataObjectId}`}</strong>
									<span className={styles.dataType}>
										{link.type === 'input' ? 'вход' : 'выход'}
									</span>
								</div>
								<button
									className={styles.deleteDataButton}
									onClick={() => onDeleteTaskData(link.id)}
									disabled={isDeletingTaskData}
								>
									Удалить
								</button>
							</div>
						))
					) : (
						<div className={styles.dataEmpty}>Связи данных пока не добавлены</div>
					)}
				</div>
			</div>

			<button
				className={styles.createInput}
				onClick={onUpdate}
			>
				Сохранить
			</button>
		</Modal>
	);
};
