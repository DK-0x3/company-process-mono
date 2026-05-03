import { dataObjectAPI } from '@entities/data-object/api/api';
import { materialAPI } from '@entities/material/api/api';
import { positionAPI } from '@entities/position/api/api';
import { Position } from '@entities/position/model/types/Position';
import { processDataAPI } from '@entities/process-data/api/api';
import { DataFlowType } from '@entities/process-data/api/types';
import { processAPI } from '@entities/process/api/api';
import { processActions, processSelections } from '@entities/process/model/slice';
import { ProcessSelect } from '@features/process/ui/process-select/ProcessSelect';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { DropDownMenu } from '@shared/ui/drop-down-menu/DropDownMenu';
import { MultiSelectDropDown } from '@shared/ui/drop-down-menu/MultiSelectDropDown';
import DropDownMenuItem from '@shared/ui/drop-down-menu/types/DropDownMenuItem';
import { Modal } from '@shared/ui/modal/ui/Modal';
import classNames from 'classnames';
import { useMemo, useState } from 'react';

import styles from './CreateProcessModal.module.scss';

interface PendingProcessDataLink {
	id: string;
	dataObjectId: number;
	dataObjectName: string;
	type: DataFlowType;
}

export const CreateProcessModal = () => {
	const dispatch = useAppDispatch();
	
	const isActive = useAppSelector(processSelections.IsActiveCreateModal);
	const createProcessData = useAppSelector(processSelections.createProcessData);
	const createProcessListener = useAppSelector(processSelections.onlyCreateProcessListener);

	const [isErrorName, setIsErrorName] = useState<boolean>(false);
	const [selectedDataObjectId, setSelectedDataObjectId] = useState<number | null>(null);
	const [selectedDataType, setSelectedDataType] = useState<DataFlowType>('input');
	const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
	const [pendingDataLinks, setPendingDataLinks] = useState<PendingProcessDataLink[]>([]);
	
	const { data: processes } = processAPI.useGetAllFlatQuery();
	const { data: processesTree } = processAPI.useGetAllTreeQuery();
	const { data: positions } = positionAPI.useGetAllQuery();
	const { data: materials } = materialAPI.useGetAllQuery();
	const { data: dataObjects } = dataObjectAPI.useGetAllQuery();
	const [createProcess] = processAPI.useCreateMutation();
	const [createProcessDataLink, { isLoading: isCreatingProcessData }] = processDataAPI.useCreateMutation();
	
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
			item.id === createProcessData.parentId);
	}, [createProcessData, processes]);
	
	const onUpdateName = (value: string) => {
		dispatch(processActions.setCreateProcessData({
			...createProcessData,
			name: value,
		}));
	};

	const onUpdateDescription = (value: string) => {
		dispatch(processActions.setCreateProcessData({
			...createProcessData,
			description: value,
		}));
	};

	const onUpdateParentId = (id: number) => {
		dispatch(processActions.setCreateProcessData({
			...createProcessData,
			parentId: id,
		}));
	};

	const onUpdateResponsiblePositionId = (id: number) => {
		dispatch(processActions.setCreateProcessData({
			...createProcessData,
			responsiblePositionId: id,
			employeeId: undefined,
			responsibleEmployeeId: undefined,
		}));
	};

	const onAddPendingDataLink = () => {
		if (!selectedDataObjectId) return;
		const dataObject = dataObjects?.find((item) => item.id === selectedDataObjectId);
		if (!dataObject) return;

		const duplicate = pendingDataLinks.some((item) =>
			item.dataObjectId === selectedDataObjectId && item.type === selectedDataType);
		if (duplicate) return;

		setPendingDataLinks((prev) => [
			...prev,
			{
				id: `${selectedDataObjectId}-${selectedDataType}-${Date.now()}`,
				dataObjectId: selectedDataObjectId,
				dataObjectName: dataObject.name,
				type: selectedDataType,
			},
		]);
	};

	const onDeletePendingDataLink = (id: string) => {
		setPendingDataLinks((prev) => prev.filter((item) => item.id !== id));
	};
	
	const onCreate = async () => {
		if (createProcessData.name.trim().length === 0) {
			setIsErrorName(true);
			return;
		}

		const { data: createdProcess } = await createProcess({
			...createProcessData,
			materialIds: selectedMaterialIds,
		});

		if (createdProcess && pendingDataLinks.length > 0) {
			await Promise.all(
				pendingDataLinks.map((link) =>
					createProcessDataLink({
						processId: createdProcess.id,
						dataObjectId: link.dataObjectId,
						type: link.type,
					}),
				),
			);
		}

		if (createProcessListener && createdProcess) {
			createProcessListener(createdProcess);
			dispatch(processActions.setOnlyCreateProcessListener(null));
		}

		onClose();
	};
	
	const onClose = () => {
		dispatch(processActions.setIsActiveCreateModal(false));
		dispatch(processActions.setCreateProcessData({
			name: '',
			description: undefined,
			parentId: undefined,
			responsiblePositionId: undefined,
			employeeId: undefined,
			responsibleEmployeeId: undefined,
		}));
		setSelectedMaterialIds([]);
		setSelectedDataObjectId(null);
		setSelectedDataType('input');
		setPendingDataLinks([]);
		setIsErrorName(false);
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			<h2>Создание процесса</h2>

			<div>
				<label>Название</label>
				<input 
					className={classNames(styles.input, {
						[styles.errorInput]: isErrorName
					})}
					value={createProcessData.name}
					onChange={(e) => onUpdateName(e.target.value)}
				/>
			</div>

			<div>
				<label>Описание</label>
				<textarea
					className={styles.input}
					value={createProcessData.description}
					onChange={(e) => onUpdateDescription(e.target.value)}
				></textarea>
			</div>

			<div className={styles.processParentContainer}>
				<label>Родительский раздел</label>
				<ProcessSelect
					processes={processesTree ?? []}
					onSelect={(p) => onUpdateParentId(p.id)}
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
								{ label: 'Вход', value: 'input' as DataFlowType },
								{ label: 'Выход', value: 'output' as DataFlowType },
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
						onClick={onAddPendingDataLink}
						disabled={!selectedDataObjectId || isCreatingProcessData}
					>
						Добавить
					</button>
				</div>

				<div className={styles.dataList}>
					{pendingDataLinks.length > 0 ? (
						pendingDataLinks.map((link) => (
							<div key={link.id} className={styles.dataItem}>
								<div>
									<strong>{link.dataObjectName}</strong>
									<span className={styles.dataType}>
										{link.type === 'input' ? 'вход' : 'выход'}
									</span>
								</div>
								<button
									className={styles.deleteDataButton}
									onClick={() => onDeletePendingDataLink(link.id)}
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
				onClick={onCreate}
			>
				Создать
			</button>
		</Modal>
	);
};
