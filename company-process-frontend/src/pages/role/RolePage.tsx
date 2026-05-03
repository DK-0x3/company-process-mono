import { roleAPI } from '@entities/role/api/api';
import { Role } from '@entities/role/model/types/Role';
import { InputWithAddon } from '@shared/ui/input-with-addon/InputWithAddon';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { useMemo, useState } from 'react';

import styles from './RolePage.module.scss';

const normalizeText = (value: string) => value.trim().toLowerCase();

export const RolePage = () => {
	const [search, setSearch] = useState('');
	const [createName, setCreateName] = useState('');
	const [createDescription, setCreateDescription] = useState('');
	const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
	const [editingName, setEditingName] = useState('');
	const [editingDescription, setEditingDescription] = useState('');

	const { data: roles } = roleAPI.useGetAllQuery();
	const [createRole, { isLoading: isCreating }] = roleAPI.useCreateMutation();
	const [updateRole, { isLoading: isUpdating }] = roleAPI.useUpdateMutation();
	const [deleteRole, { isLoading: isDeleting }] = roleAPI.useDeleteMutation();

	const summary = useMemo(() => {
		const allRoles = roles ?? [];
		return {
			roles: allRoles.length,
			employees: allRoles.reduce((accumulator, role) => accumulator + (role.employees?.length ?? 0), 0),
			processes: allRoles.reduce((accumulator, role) => accumulator + (role._count?.responsibleForProcesses ?? 0), 0),
			tasks: allRoles.reduce((accumulator, role) => accumulator + (role._count?.responsibleForTasks ?? 0), 0),
		};
	}, [roles]);

	const filteredRoles = useMemo(() => {
		const searchLower = normalizeText(search);
		return (roles ?? []).filter((role) => {
			if (!searchLower) return true;
			return (
				normalizeText(role.name).includes(searchLower)
				|| normalizeText(role.description ?? '').includes(searchLower)
			);
		});
	}, [roles, search]);

	const onCreate = async () => {
		if (!createName.trim()) return;

		await createRole({
			name: createName.trim(),
			description: createDescription.trim() || undefined,
		});

		setCreateName('');
		setCreateDescription('');
	};

	const onStartEdit = (role: Role) => {
		setEditingRoleId(role.id);
		setEditingName(role.name);
		setEditingDescription(role.description ?? '');
	};

	const onCancelEdit = () => {
		setEditingRoleId(null);
		setEditingName('');
		setEditingDescription('');
	};

	const onSaveEdit = async () => {
		if (!editingRoleId || !editingName.trim()) return;

		await updateRole({
			id: editingRoleId,
			name: editingName.trim(),
			description: editingDescription.trim() || undefined,
		});

		onCancelEdit();
	};

	const onDelete = async (role: Role) => {
		const confirmed = window.confirm(`Удалить роль "${role.name}"?`);
		if (!confirmed) return;

		await deleteRole({ id: role.id });
		if (editingRoleId === role.id) {
			onCancelEdit();
		}
	};

	return (
		<div className={styles.wrapper}>
			<div className={styles.hero}>
				<div>
					<h1 className={styles.title}>Роли</h1>
					<p className={styles.subtitle}>
						Управление ролями и их участием в процессах и задачах.
					</p>
				</div>

				<div className={styles.heroMetrics}>
					<div className={styles.metric}>
						<span className={styles.metricLabel}>Ролей</span>
						<span className={styles.metricValue}>{summary.roles}</span>
					</div>
					<div className={styles.metric}>
						<span className={styles.metricLabel}>Сотрудников</span>
						<span className={styles.metricValue}>{summary.employees}</span>
					</div>
					<div className={styles.metric}>
						<span className={styles.metricLabel}>Процессы</span>
						<span className={styles.metricValue}>{summary.processes}</span>
					</div>
					<div className={styles.metric}>
						<span className={styles.metricLabel}>Задачи</span>
						<span className={styles.metricValue}>{summary.tasks}</span>
					</div>
				</div>
			</div>

			<div className={styles.topRow}>
				<div className={styles.createCard}>
					<h3>Создать роль</h3>
					<input
						value={createName}
						onChange={(event) => setCreateName(event.target.value)}
						placeholder="Название роли"
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

				<div className={styles.toolsCard}>
					<label className={styles.toolsLabel}>Поиск по ролям</label>
					<InputWithAddon
						containerClassName={styles.search}
						inputClassName={styles.searchInput}
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						leftAddon={<SmartIcon iconName={'search'} className={styles.searchIcon}/>}
					/>
					<div className={styles.helperText}>
						Поиск по названию и описанию роли.
					</div>
				</div>
			</div>

			<div className={styles.tableCard}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Название</th>
							<th>Описание</th>
							<th>Сотрудники</th>
							<th>Процессы</th>
							<th>Задачи</th>
							<th>Действия</th>
						</tr>
					</thead>
					<tbody>
						{filteredRoles.map((role) => {
							const isEditing = editingRoleId === role.id;
							return (
								<tr key={role.id}>
									<td>
										{isEditing ? (
											<input
												className={styles.cellInput}
												value={editingName}
												onChange={(event) => setEditingName(event.target.value)}
											/>
										) : role.name}
									</td>
									<td>
										{isEditing ? (
											<input
												className={styles.cellInput}
												value={editingDescription}
												onChange={(event) => setEditingDescription(event.target.value)}
											/>
										) : (role.description ?? '-')}
									</td>
									<td>{role.employees?.length ?? 0}</td>
									<td>{role._count?.responsibleForProcesses ?? 0}</td>
									<td>{role._count?.responsibleForTasks ?? 0}</td>
									<td>
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
													<button onClick={() => onStartEdit(role)} className={styles.actionSecondary}>Ред.</button>
													<button
														onClick={() => onDelete(role)}
														disabled={isDeleting}
														className={styles.actionDanger}
													>
														Удалить
													</button>
												</>
											)}
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
				{filteredRoles.length === 0 && (
					<div className={styles.empty}>Роли не найдены</div>
				)}
			</div>
		</div>
	);
};
