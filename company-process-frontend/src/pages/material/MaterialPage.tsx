import { canEditEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { materialAPI } from '@entities/material/api/api';
import { Material } from '@entities/material/model/types/Material';
import routes from '@shared/config/routes';
import { InputWithAddon } from '@shared/ui/input-with-addon/InputWithAddon';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './MaterialPage.module.scss';

const normalizeText = (value: string) => value.trim().toLowerCase();

const formatDate = (value?: string) => {
	if (!value) return '-';
	return new Date(value).toLocaleString('ru-RU', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
};

export const MaterialPage = () => {
	const authUser = useAppSelector(selectAuthUser);
	const canEditMaterials = canEditEntity(authUser, 'materials');
	const navigate = useNavigate();
	const [search, setSearch] = useState('');

	const { data: materials } = materialAPI.useGetAllQuery();
	const { data: categories } = materialAPI.useGetAllCategoriesQuery();
	const [deleteMaterial, { isLoading: isDeletingMaterial }] = materialAPI.useDeleteMutation();

	const summary = useMemo(() => {
		const allMaterials = materials ?? [];
		const allCategories = categories ?? [];

		return {
			materials: allMaterials.length,
			categories: allCategories.length,
			processLinks: allMaterials.reduce((accumulator, material) => accumulator + (material._count?.processMaterials ?? material.processMaterials?.length ?? 0), 0),
			taskLinks: allMaterials.reduce((accumulator, material) => accumulator + (material._count?.taskMaterials ?? material.taskMaterials?.length ?? 0), 0),
		};
	}, [materials, categories]);

	const filteredMaterials = useMemo(() => {
		const searchLower = normalizeText(search);
		return (materials ?? []).filter((material) => {
			if (!searchLower) return true;

			const processesLine = (material.processMaterials ?? []).map((link) => link.process?.name ?? '').join(' ');
			const tasksLine = (material.taskMaterials ?? []).map((link) => link.task?.name ?? '').join(' ');

			return (
				normalizeText(material.name).includes(searchLower)
				|| normalizeText(material.category?.name ?? '').includes(searchLower)
				|| normalizeText(processesLine).includes(searchLower)
				|| normalizeText(tasksLine).includes(searchLower)
			);
		});
	}, [materials, search]);

	const onDeleteMaterial = async (material: Material) => {
		const confirmed = window.confirm(`Удалить материал "${material.name}"?`);
		if (!confirmed) return;

		await deleteMaterial({ id: material.id }).unwrap();
	};

	return (
		<div className={styles.wrapper}>
			<div className={styles.hero}>
				<div>
					<h1 className={styles.title}>Материалы</h1>
					<p className={styles.subtitle}>
						Список обучающих статей и инструкций, привязанных к процессам и задачам.
					</p>
				</div>

				<div className={styles.heroMetrics}>
					<div className={styles.metric}>
						<span className={styles.metricLabel}>Материалов</span>
						<span className={styles.metricValue}>{summary.materials}</span>
					</div>
					<div className={styles.metric}>
						<span className={styles.metricLabel}>Категорий</span>
						<span className={styles.metricValue}>{summary.categories}</span>
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

			<div className={styles.toolsRow}>
				<div className={styles.searchCard}>
					<label className={styles.toolsLabel}>Поиск по материалам</label>
					<InputWithAddon
						containerClassName={styles.search}
						inputClassName={styles.searchInput}
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						leftAddon={<SmartIcon iconName={'search'} className={styles.searchIcon}/>}
					/>
					<div className={styles.helperText}>
						Поиск по названию, категории и привязкам к процессам/задачам.
					</div>
				</div>

				<div className={styles.actionsCard}>
					{canEditMaterials && (
						<button
							onClick={() => navigate(routes.MATERIAL_CREATE)}
							className={styles.primaryButton}
						>
							Создать материал
						</button>
					)}
				</div>
			</div>

			<div className={styles.tableCard}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Название</th>
							<th>Категория</th>
							<th>Связи с процессами</th>
							<th>Связи с задачами</th>
							<th>Обновлено</th>
							<th>Действия</th>
						</tr>
					</thead>
					<tbody>
						{filteredMaterials.map((material) => (
							<tr key={material.id}>
								<td>{material.name}</td>
								<td>{material.category?.name ?? '-'}</td>
								<td>{material._count?.processMaterials ?? material.processMaterials?.length ?? 0}</td>
								<td>{material._count?.taskMaterials ?? material.taskMaterials?.length ?? 0}</td>
								<td>{formatDate(material.updatedAt)}</td>
								<td>
									{canEditMaterials ? (
										<div className={styles.actionRow}>
											<button
												onClick={() => navigate(`/materials/${material.id}/edit`)}
												className={styles.actionSecondary}
											>
												Ред.
											</button>
											<button
												onClick={() => onDeleteMaterial(material)}
												disabled={isDeletingMaterial}
												className={styles.actionDanger}
											>
												Удалить
											</button>
										</div>
									) : '-'}
								</td>
							</tr>
						))}
					</tbody>
				</table>

				{filteredMaterials.length === 0 && (
					<div className={styles.empty}>Материалы не найдены</div>
				)}
			</div>
		</div>
	);
};
