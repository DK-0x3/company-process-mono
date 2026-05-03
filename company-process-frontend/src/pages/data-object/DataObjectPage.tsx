import { dataObjectAPI } from '@entities/data-object/api/api';
import { canEditEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { DataObject } from '@entities/data-object/model/types/DataObject';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { InputWithAddon } from '@shared/ui/input-with-addon/InputWithAddon';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { useMemo, useState } from 'react';

import styles from './DataObjectPage.module.scss';

const normalizeText = (value: string) => value.trim().toLowerCase();

export const DataObjectPage = () => {
	const authUser = useAppSelector(selectAuthUser);
	const canEditDataObjects = canEditEntity(authUser, 'dataObjects');
	const [search, setSearch] = useState('');
	const [createName, setCreateName] = useState('');
	const [createDescription, setCreateDescription] = useState('');
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editingName, setEditingName] = useState('');
	const [editingDescription, setEditingDescription] = useState('');

	const { data: dataObjects } = dataObjectAPI.useGetAllQuery();
	const [createDataObject, { isLoading: isCreating }] = dataObjectAPI.useCreateMutation();
	const [updateDataObject, { isLoading: isUpdating }] = dataObjectAPI.useUpdateMutation();
	const [deleteDataObject, { isLoading: isDeleting }] = dataObjectAPI.useDeleteMutation();

	const summary = useMemo(() => {
		const allObjects = dataObjects ?? [];
		return {
			objects: allObjects.length,
			processLinks: allObjects.reduce((accumulator, dataObject) => accumulator + (dataObject.processData?.length ?? 0), 0),
			taskLinks: allObjects.reduce((accumulator, dataObject) => accumulator + (dataObject.taskData?.length ?? 0), 0),
		};
	}, [dataObjects]);

	const filtered = useMemo(() => {
		const searchLower = normalizeText(search);
		return (dataObjects ?? []).filter((dataObject) => {
			if (!searchLower) return true;
			return (
				normalizeText(dataObject.name).includes(searchLower)
				|| normalizeText(dataObject.description ?? '').includes(searchLower)
			);
		});
	}, [dataObjects, search]);

	const onCreate = async () => {
		if (!createName.trim()) return;

		await createDataObject({
			name: createName.trim(),
			description: createDescription.trim() || undefined,
		});
		setCreateName('');
		setCreateDescription('');
	};

	const onStartEdit = (dataObject: DataObject) => {
		setEditingId(dataObject.id);
		setEditingName(dataObject.name);
		setEditingDescription(dataObject.description ?? '');
	};

	const onCancelEdit = () => {
		setEditingId(null);
		setEditingName('');
		setEditingDescription('');
	};

	const onSaveEdit = async () => {
		if (!editingId || !editingName.trim()) return;

		await updateDataObject({
			id: editingId,
			name: editingName.trim(),
			description: editingDescription.trim() || undefined,
		});

		onCancelEdit();
	};

	const onDelete = async (dataObject: DataObject) => {
		const confirmed = window.confirm(`Удалить объект данных "${dataObject.name}"?`);
		if (!confirmed) return;
		await deleteDataObject({ id: dataObject.id });
		if (editingId === dataObject.id) {
			onCancelEdit();
		}
	};

	return (
		<div className={styles.wrapper}>
			<div className={styles.hero}>
				<div>
					<h1 className={styles.title}>Объекты данных</h1>
					<p className={styles.subtitle}>
						Справочник входов и выходов процессов и задач.
					</p>
				</div>

				<div className={styles.heroMetrics}>
					<div className={styles.metric}>
						<span className={styles.metricLabel}>Объектов</span>
						<span className={styles.metricValue}>{summary.objects}</span>
					</div>
					<div className={styles.metric}>
						<span className={styles.metricLabel}>Связи с процессами</span>
						<span className={styles.metricValue}>{summary.processLinks}</span>
					</div>
					<div className={styles.metric}>
						<span className={styles.metricLabel}>Связи с задачами</span>
						<span className={styles.metricValue}>{summary.taskLinks}</span>
					</div>
				</div>
			</div>

			<div className={styles.topRow}>
				{canEditDataObjects && (
					<div className={styles.createCard}>
						<h3>Создать объект данных</h3>
						<input
							value={createName}
							onChange={(event) => setCreateName(event.target.value)}
							placeholder="Название"
						/>
						<textarea
							value={createDescription}
							onChange={(event) => setCreateDescription(event.target.value)}
							placeholder="Описание (опционально)"
						/>
						<button
							onClick={onCreate}
							disabled={isCreating || !createName.trim()}
							className={styles.primaryButton}
						>
							{isCreating ? 'Создание...' : 'Создать'}
						</button>
					</div>
				)}

				<div className={styles.toolsCard}>
					<label className={styles.toolsLabel}>Поиск по объектам данных</label>
					<InputWithAddon
						containerClassName={styles.search}
						inputClassName={styles.searchInput}
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						leftAddon={<SmartIcon iconName={'search'} className={styles.searchIcon}/>}
					/>
					<div className={styles.helperText}>
						Поиск по названию и описанию объекта.
					</div>
				</div>
			</div>

			<div className={styles.tableCard}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Название</th>
							<th>Описание</th>
							<th>Связей с процессами</th>
							<th>Связей с задачами</th>
							<th>Действия</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((dataObject) => {
							const isEditing = editingId === dataObject.id;
							return (
								<tr key={dataObject.id}>
									<td>
										{isEditing ? (
											<input
												className={styles.cellInput}
												value={editingName}
												onChange={(event) => setEditingName(event.target.value)}
											/>
										) : dataObject.name}
									</td>
									<td>
										{isEditing ? (
											<input
												className={styles.cellInput}
												value={editingDescription}
												onChange={(event) => setEditingDescription(event.target.value)}
											/>
										) : (dataObject.description ?? '-')}
									</td>
									<td>{dataObject.processData?.length ?? 0}</td>
									<td>{dataObject.taskData?.length ?? 0}</td>
									<td>
										{canEditDataObjects ? (
											<div className={styles.actionRow}>
												{isEditing ? (
													<>
														<button
															onClick={onSaveEdit}
															disabled={isUpdating || !editingName.trim()}
															className={styles.actionPrimary}
														>
															Сохранить
														</button>
														<button onClick={onCancelEdit} className={styles.actionSecondary}>Отмена</button>
													</>
												) : (
													<>
														<button onClick={() => onStartEdit(dataObject)} className={styles.actionSecondary}>Ред.</button>
														<button
															onClick={() => onDelete(dataObject)}
															disabled={isDeleting}
															className={styles.actionDanger}
														>
															Удалить
														</button>
													</>
												)}
											</div>
										) : '-'}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>

				{filtered.length === 0 && (
					<div className={styles.empty}>Объекты данных не найдены</div>
				)}
			</div>
		</div>
	);
};
