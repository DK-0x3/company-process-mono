import { dataObjectAPI } from '@entities/data-object/api/api';
import { materialAPI } from '@entities/material/api/api';
import { positionAPI } from '@entities/position/api/api';
import { Position } from '@entities/position/model/types/Position';
import { processDataAPI } from '@entities/process-data/api/api';
import { DataFlowType } from '@entities/process-data/api/types';
import { processAPI } from '@entities/process/api/api';
import { processActions, processSelections } from '@entities/process/model/slice';
import { Process } from '@entities/process/model/types/Process';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { DropDownMenu } from '@shared/ui/drop-down-menu/DropDownMenu';
import { MultiSelectDropDown } from '@shared/ui/drop-down-menu/MultiSelectDropDown';
import DropDownMenuItem from '@shared/ui/drop-down-menu/types/DropDownMenuItem';
import { Modal } from '@shared/ui/modal/ui/Modal';
import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'react';

import styles from './UpdateProcessModal.module.scss';

export const UpdateProcessModal = () => {
	const dispatch = useAppDispatch();
	
	const isActive = useAppSelector(processSelections.IsActiveUpdateModal);
	const updateProcessData = useAppSelector(processSelections.updateProcessData);
	const updateProcessListener = useAppSelector(processSelections.onlyUpdateFirstListener);
	
	const [isErrorName, setIsErrorName] = useState<boolean>(false);
	const [selectedDataObjectId, setSelectedDataObjectId] = useState<number | null>(null);
	const [selectedDataType, setSelectedDataType] = useState<DataFlowType>('input');
	const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
	const processId = updateProcessData.id ?? 0;
	
	const { data: processes } = processAPI.useGetAllFlatQuery();
	const { data: processById } = processAPI.useGetByIdQuery(
		processId > 0 ? { id: processId } : skipToken,
	);
	const { data: positions } = positionAPI.useGetAllQuery();
	const { data: dataObjects } = dataObjectAPI.useGetAllQuery();
	const { data: materials } = materialAPI.useGetAllQuery();
	const { data: processDataLinks } = processDataAPI.useGetAllQuery(
		processId > 0 ? { processId } : skipToken,
	);
	const [updateProcess] = processAPI.useUpdateMutation();
	const [createProcessData, { isLoading: isCreatingProcessData }] = processDataAPI.useCreateMutation();
	const [deleteProcessData, { isLoading: isDeletingProcessData }] = processDataAPI.useDeleteMutation();
	
	const processMenuItems = useMemo(() => {
		if (!processes) return [];
		
		const resultMenuItems: DropDownMenuItem<Process>[] = [];
		
		processes.forEach((process) => {
			resultMenuItems.push({
				label: process.name,
				value: process,
			});
		});

		return resultMenuItems;
	}, [processes]);
	
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
		return processMenuItems.find((item) =>
			item.value.id === updateProcessData.parentId);
	}, [updateProcessData, processMenuItems]);

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

		const fromRelations = (processById?.processMaterials ?? []).map((item) => item.materialId);
		setSelectedMaterialIds(Array.from(new Set(fromRelations)));
	}, [processById?.processMaterials, updateProcessData.id, updateProcessData.materialIds]);

	const onUpdateName = (value: string) => {
		dispatch(processActions.setUpdateProcessData({
			...updateProcessData,
			name: value,
		}));
	};

	const onUpdateDescription = (value: string) => {
		dispatch(processActions.setUpdateProcessData({
			...updateProcessData,
			description: value,
		}));
	};

	const onUpdateParentId = (id: number) => {
		dispatch(processActions.setUpdateProcessData({
			...updateProcessData,
			parentId: id,
		}));
	};

	const onUpdateResponsiblePositionId = (id: number) => {
		dispatch(processActions.setUpdateProcessData({
			...updateProcessData,
			responsiblePositionId: id,
			employeeId: undefined,
			responsibleEmployeeId: undefined,
		}));
	};

	const onAddProcessData = async () => {
		if (processId <= 0 || !selectedDataObjectId) return;

		await createProcessData({
			processId,
			dataObjectId: selectedDataObjectId,
			type: selectedDataType,
		});
	};

	const onDeleteProcessData = async (id: number) => {
		await deleteProcessData({ id });
	};
	
	const onUpdate = async () => {
		if (updateProcessData.name?.trim().length === 0) {
			setIsErrorName(true);
			return;
		}

		const { data: updatedProcess } = await updateProcess({
			...updateProcessData,
			materialIds: selectedMaterialIds,
		});

		if (updateProcessListener && updatedProcess) {
			updateProcessListener(updatedProcess);
			dispatch(processActions.setOnlyUpdateProcessListener(null));
		}

		dispatch(processActions.setIsActiveUpdateModal(false));
		
		setIsErrorName(false);
		dispatch(processActions.setUpdateProcessData({
			id: 0,
		}));
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={()=>
				dispatch(processActions.setIsActiveUpdateModal(false))}
			contentClassName={styles.wrapper}
		>
			<h2>Редактирование процесса</h2>

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
				<DropDownMenu 
					items={processMenuItems}
					buttonClassName={styles.button}
					isMenuMatchButtonWidth={true}
					label="Выберите раздел"
					showSelectedItem={true}
					onSelect={(item) => onUpdateParentId(item.value.id)}
					initialSelectedItem={initialParentProcess}
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
				<label>Материалы процесса</label>
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
				<label>Входы/выходы процесса</label>

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
						onClick={onAddProcessData}
						disabled={!selectedDataObjectId || isCreatingProcessData}
					>
						{isCreatingProcessData ? 'Добавление...' : 'Добавить'}
					</button>
				</div>

				<div className={styles.dataList}>
					{processDataLinks && processDataLinks.length > 0 ? (
						processDataLinks.map((link) => (
							<div key={link.id} className={styles.dataItem}>
								<div>
									<strong>{link.dataObject?.name ?? `ID ${link.dataObjectId}`}</strong>
									<span className={styles.dataType}>
										{link.type === 'input' ? 'вход' : 'выход'}
									</span>
								</div>
								<button
									className={styles.deleteDataButton}
									onClick={() => onDeleteProcessData(link.id)}
									disabled={isDeletingProcessData}
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
