import { materialAPI } from '@entities/material/api/api';
import { Material } from '@entities/material/model/types/Material';
import { skipToken } from '@reduxjs/toolkit/query';
import { Modal } from '@shared/ui/modal/ui/Modal';
import MDEditor from '@uiw/react-md-editor';
import { useState } from 'react';
import remarkGfm from 'remark-gfm';

import '@uiw/react-markdown-preview/markdown.css';

import styles from './ViewMaterialModal.module.scss';

interface ViewMaterialModalProps {
	isActive: boolean;
	materialId: number | null;
	materialData?: {
		id: number;
		name: string;
		content: string;
		category: { id: number; name: string } | null;
		updatedAt: string;
	} | null;
	onClose: (active: boolean) => void;
}

const formatDateTime = (date?: string) => {
	if (!date) return '-';

	return new Date(date).toLocaleString('ru-RU', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
};

export const ViewMaterialModal = ({
	isActive,
	materialId,
	materialData,
	onClose,
}: ViewMaterialModalProps) => {
	const [isFullscreen, setIsFullscreen] = useState(false);
	const shouldLoadFromApi = !materialData && materialId !== null;
	const { data: materialFromApi, isFetching } = materialAPI.useGetByIdQuery(
		materialId ? { id: materialId } : skipToken,
		{
			refetchOnMountOrArgChange: true,
			skip: !shouldLoadFromApi,
		},
	);
	const material = materialData ?? (materialFromApi as Material | undefined);

	const onCloseModal = (active: boolean) => {
		if (!active) {
			setIsFullscreen(false);
		}
		onClose(active);
	};

	return (
		<Modal
			isActive={isActive}
			onClose={onCloseModal}
			contentClassName={`${styles.wrapper} ${isFullscreen ? styles.wrapperFullscreen : ''}`}
			modalInModalActive
		>
			{(shouldLoadFromApi && isFetching) || !material ? (
				<div className={styles.loading}>Загрузка материала...</div>
			) : (
				<>
					<div className={styles.header}>
						<div className={styles.topRow}>
							<div className={styles.titleWrap}>
								<label className={styles.label}>Материал</label>
								<h2 className={styles.title}>{material.name}</h2>
							</div>
							<button
								type="button"
								className={styles.expandButton}
								onClick={() => setIsFullscreen((prev) => !prev)}
							>
								{isFullscreen ? 'Обычный размер' : 'На весь экран'}
							</button>
						</div>
						<div className={styles.meta}>
							<div className={styles.metaItem}>
								<span className={styles.metaKey}>Категория</span>
								<span className={styles.metaValue}>{material.category?.name ?? '-'}</span>
							</div>
							<div className={styles.metaItem}>
								<span className={styles.metaKey}>Обновлен</span>
								<span className={styles.metaValue}>{formatDateTime(material.updatedAt)}</span>
							</div>
						</div>
					</div>

					<div className={styles.content}>
						<MDEditor.Markdown
							source={material.content}
							remarkPlugins={[remarkGfm]}
							style={{ backgroundColor: 'transparent' }}
						/>
					</div>
				</>
			)}
		</Modal>
	);
};
