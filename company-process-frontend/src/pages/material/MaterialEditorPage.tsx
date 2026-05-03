import {
	materialAPI,
} from '@entities/material/api/api';
import { MaterialCategory } from '@entities/material/model/types/Material';
import routes from '@shared/config/routes';
import { Modal } from '@shared/ui/modal/ui/Modal';
import { useEffect, useMemo, useState } from 'react';
import MDEditor, { commands, ICommand, TextAreaTextApi, TextState } from '@uiw/react-md-editor';
import { useNavigate, useParams } from 'react-router-dom';

import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import remarkGfm from 'remark-gfm';

import styles from './MaterialEditorPage.module.scss';

const videoCommand: ICommand = {
	name: 'insert-video',
	keyCommand: 'insert-video',
	buttonProps: { 'aria-label': 'Вставить видео' },
	icon: <span className={styles.toolbarText}>Видео</span>,
	execute: (_state: TextState, api: TextAreaTextApi) => {
		api.replaceSelection(
			'\n<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n',
		);
	},
};

const processCommands: ICommand[] = [
	commands.group([
		commands.title1,
		commands.title2,
		commands.title3,
		commands.title4,
		commands.title5,
		commands.title6,
	], {
		name: 'title',
		groupName: 'title',
		buttonProps: { 'aria-label': 'Заголовки' },
	}),
	commands.bold,
	commands.italic,
	commands.strikethrough,
	commands.hr,
	commands.divider,
	commands.link,
	commands.image,
	videoCommand,
	commands.divider,
	commands.quote,
	commands.unorderedListCommand,
	commands.orderedListCommand,
	commands.checkedListCommand,
	commands.divider,
	commands.code,
	commands.codeBlock,
];

export const MaterialEditorPage = () => {
	const navigate = useNavigate();
	const params = useParams<{ materialId?: string }>();
	const materialId = params.materialId ? Number(params.materialId) : undefined;
	const isEditMode = Boolean(materialId);

	const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

	const [materialName, setMaterialName] = useState('');
	const [materialCategoryId, setMaterialCategoryId] = useState<number | null>(null);
	const [materialContent, setMaterialContent] = useState('');

	const [categoryName, setCategoryName] = useState('');
	const [categoryDescription, setCategoryDescription] = useState('');
	const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
	const [editingCategoryName, setEditingCategoryName] = useState('');
	const [editingCategoryDescription, setEditingCategoryDescription] = useState('');

	const { data: categories } = materialAPI.useGetAllCategoriesQuery();
	const { data: material } = materialAPI.useGetByIdQuery(
		{ id: materialId ?? 0 },
		{ skip: !isEditMode || !materialId },
	);

	const [createMaterial, { isLoading: isCreatingMaterial }] = materialAPI.useCreateMutation();
	const [updateMaterial, { isLoading: isUpdatingMaterial }] = materialAPI.useUpdateMutation();

	const [createCategory, { isLoading: isCreatingCategory }] = materialAPI.useCreateCategoryMutation();
	const [updateCategory, { isLoading: isUpdatingCategory }] = materialAPI.useUpdateCategoryMutation();
	const [deleteCategory, { isLoading: isDeletingCategory }] = materialAPI.useDeleteCategoryMutation();

	useEffect(() => {
		if (!material || !isEditMode) return;

		setMaterialName(material.name);
		setMaterialCategoryId(material.categoryId);
		setMaterialContent(material.content);
	}, [material, isEditMode]);

	const selectedCategoryName = useMemo(() => {
		const match = (categories ?? []).find((category) => category.id === materialCategoryId);
		return match?.name ?? 'Не выбрана';
	}, [categories, materialCategoryId]);

	const onSubmitMaterial = async () => {
		if (!materialName.trim() || !materialCategoryId || !materialContent.trim()) return;

		if (isEditMode && materialId) {
			await updateMaterial({
				id: materialId,
				name: materialName.trim(),
				categoryId: materialCategoryId,
				content: materialContent,
			}).unwrap();
		} else {
			await createMaterial({
				name: materialName.trim(),
				categoryId: materialCategoryId,
				content: materialContent,
			}).unwrap();
		}

		navigate(routes.MATERIAL);
	};

	const onCreateCategory = async () => {
		if (!categoryName.trim()) return;

		await createCategory({
			name: categoryName.trim(),
			description: categoryDescription.trim() || undefined,
		}).unwrap();

		setCategoryName('');
		setCategoryDescription('');
	};

	const onStartEditCategory = (category: MaterialCategory) => {
		setEditingCategoryId(category.id);
		setEditingCategoryName(category.name);
		setEditingCategoryDescription(category.description ?? '');
	};

	const onCancelCategoryEdit = () => {
		setEditingCategoryId(null);
		setEditingCategoryName('');
		setEditingCategoryDescription('');
	};

	const onSaveCategory = async () => {
		if (!editingCategoryId || !editingCategoryName.trim()) return;

		await updateCategory({
			id: editingCategoryId,
			name: editingCategoryName.trim(),
			description: editingCategoryDescription.trim() || undefined,
		}).unwrap();

		onCancelCategoryEdit();
	};

	const onDeleteCategory = async (category: MaterialCategory) => {
		const confirmed = window.confirm(`Удалить категорию "${category.name}"?`);
		if (!confirmed) return;

		try {
			await deleteCategory({ id: category.id }).unwrap();
		} catch (error: any) {
			const message = error?.data?.message ?? 'Не удалось удалить категорию';
			alert(Array.isArray(message) ? message.join('\n') : message);
		}
	};

	return (
		<div className={styles.wrapper}>
				<div className={styles.headerRow}>
					<div>
						<h1 className={styles.title}>{isEditMode ? 'Редактирование материала' : 'Создание материала'}</h1>
						<p className={styles.subtitle}>
							Заполните данные материала и выберите категорию.
						</p>
					</div>

				<div className={styles.headerActions}>
					<button onClick={() => navigate(routes.MATERIAL)} className={styles.actionSecondary}>К списку</button>
					<button
						onClick={onSubmitMaterial}
						disabled={isCreatingMaterial || isUpdatingMaterial || !materialName.trim() || !materialCategoryId || !materialContent.trim()}
						className={styles.primaryButton}
					>
						{isEditMode
							? (isUpdatingMaterial ? 'Сохранение...' : 'Сохранить')
							: (isCreatingMaterial ? 'Создание...' : 'Создать')}
					</button>
				</div>
			</div>

			<div className={styles.formCard}>
				<div className={styles.formRow}>
					<input
						value={materialName}
						onChange={(event) => setMaterialName(event.target.value)}
						placeholder="Название материала"
					/>

					<div className={styles.categoryRow}>
						<select
							value={materialCategoryId ?? ''}
							onChange={(event) => setMaterialCategoryId(event.target.value ? Number(event.target.value) : null)}
						>
							<option value="">Выберите категорию</option>
							{(categories ?? []).map((category) => (
								<option key={category.id} value={category.id}>{category.name}</option>
							))}
						</select>
						<button type="button" className={styles.actionSecondary} onClick={() => setIsCategoriesModalOpen(true)}>
							Категории
						</button>
					</div>
				</div>

				<div className={styles.currentCategory}>Текущая категория: {selectedCategoryName}</div>

				<div data-color-mode="light" className={styles.editorWrap}>
					<MDEditor
						value={materialContent}
						onChange={(value: string | undefined) => setMaterialContent(value ?? '')}
						height={520}
						preview="live"
						commands={processCommands}
						extraCommands={[commands.codeEdit, commands.codeLive, commands.codePreview, commands.fullscreen]}
						previewOptions={{
							remarkPlugins: [remarkGfm],
						}}
					/>
				</div>
			</div>

			<Modal
				isActive={isCategoriesModalOpen}
				onClose={setIsCategoriesModalOpen}
				contentClassName={styles.categoryModal}
			>
				<h3 className={styles.categoryModalTitle}>Категории материалов</h3>

				<div className={styles.categoryCreateRow}>
					<input
						value={categoryName}
						onChange={(event) => setCategoryName(event.target.value)}
						placeholder="Название категории"
					/>
					<textarea
						value={categoryDescription}
						onChange={(event) => setCategoryDescription(event.target.value)}
						placeholder="Описание (опционально)"
					/>
					<button
						onClick={onCreateCategory}
						disabled={isCreatingCategory || !categoryName.trim()}
						className={styles.primaryButton}
					>
						{isCreatingCategory ? 'Создание...' : 'Создать категорию'}
					</button>
				</div>

				<div className={styles.categoryTableWrap}>
					<table className={styles.categoryTable}>
						<thead>
							<tr>
								<th>Название</th>
								<th>Описание</th>
								<th>Материалов</th>
								<th>Действия</th>
							</tr>
						</thead>
						<tbody>
							{(categories ?? []).map((category) => {
								const isEditing = editingCategoryId === category.id;

								return (
									<tr key={category.id}>
										<td>
											{isEditing ? (
												<input
													value={editingCategoryName}
													onChange={(event) => setEditingCategoryName(event.target.value)}
													className={styles.cellInput}
												/>
											) : category.name}
										</td>
										<td>
											{isEditing ? (
												<input
													value={editingCategoryDescription}
													onChange={(event) => setEditingCategoryDescription(event.target.value)}
													className={styles.cellInput}
												/>
											) : (category.description ?? '-')}
										</td>
										<td>{category._count?.materials ?? 0}</td>
										<td>
											<div className={styles.actionRow}>
												{isEditing ? (
													<>
														<button
															onClick={onSaveCategory}
															disabled={isUpdatingCategory || !editingCategoryName.trim()}
															className={styles.actionPrimary}
														>
															Сохранить
														</button>
														<button onClick={onCancelCategoryEdit} className={styles.actionSecondary}>Отмена</button>
													</>
												) : (
													<>
														<button onClick={() => onStartEditCategory(category)} className={styles.actionSecondary}>Ред.</button>
														<button
															onClick={() => onDeleteCategory(category)}
															disabled={isDeletingCategory}
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
				</div>
			</Modal>
		</div>
	);
};
