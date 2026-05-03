import { positionAPI } from '@entities/position/api/api';
import { positionActions, positionSelectors } from '@entities/position/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Modal } from '@shared/ui/modal/ui/Modal';
import classNames from 'classnames';
import { useState } from 'react';

import styles from './UpdatePositionModal.module.scss';

export const UpdatePositionModal = () => {
	const dispatch = useAppDispatch();
	
	const isActive = useAppSelector(positionSelectors.isActiveUpdateModal);
	const updatePositionData = useAppSelector(positionSelectors.updateData);
	
	const [isErrorName, setIsErrorName] = useState<boolean>(false);

	const [updatePosition] = positionAPI.useUpdateMutation();
	
	const onUpdateName = (value: string) => {
		dispatch(positionActions.setUpdateData({
			name: value,
		}));
	};
	
	const onUpdate = () => {
		let isError = false;
		setIsErrorName(false);
		const nextName = updatePositionData.name ?? '';

		if (nextName.trim().length === 0) {
			setIsErrorName(true);
			isError = true;
		}

		if (isError) return;

		updatePosition({
			...updatePositionData,
		});

		onClose();
	};
	
	const onClose = () => {
		dispatch(positionActions.setIsActiveUpdateModal(false));
		dispatch(positionActions.clearUpdateData());
		setIsErrorName(false);
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			<div className={styles.content}>
				<h2>Редактировать должность</h2>

				<div>
					<label>Название</label>
					<input
						className={classNames(styles.input, {
							[styles.errorInput]: isErrorName
						})}
						value={updatePositionData.name ?? ''}
						onChange={(e) => onUpdateName(e.target.value)}
					/>
				</div>
			</div>

			<button
				className={styles.createButton}
				onClick={onUpdate}
			>
				Сохранить
			</button>
		</Modal>
	);
};
