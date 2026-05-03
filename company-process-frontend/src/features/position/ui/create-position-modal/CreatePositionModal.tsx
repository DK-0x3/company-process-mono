import { positionAPI } from '@entities/position/api/api';
import { positionActions, positionSelectors } from '@entities/position/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { Modal } from '@shared/ui/modal/ui/Modal';
import classNames from 'classnames';
import { useState } from 'react';

import styles from './CreatePositionModal.module.scss';

export const CreatePositionModal = () => {
	const dispatch = useAppDispatch();
	
	const isActive = useAppSelector(positionSelectors.isActiveCreateModal);
	const createPositionData = useAppSelector(positionSelectors.createData);
	
	const [isErrorName, setIsErrorName] = useState<boolean>(false);

	const [createPosition] = positionAPI.useCreateMutation();
	
	const onUpdateName = (value: string) => {
		dispatch(positionActions.setCreateData({
			name: value,
		}));
	};
	
	const onCreate = () => {
		let isError = false;
		setIsErrorName(false);

		if (createPositionData.name.trim().length === 0) {
			setIsErrorName(true);
			isError = true;
		}

		if (isError) return;

		createPosition({
			...createPositionData,
		});

		onClose();
	};
	
	const onClose = () => {
		dispatch(positionActions.setIsActiveCreateModal(false));
		dispatch(positionActions.clearCreateData());
		setIsErrorName(false);
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			<div className={styles.content}>
				<h2>Создание должности</h2>

				<div>
					<label>Название</label>
					<input
						className={classNames(styles.input, {
							[styles.errorInput]: isErrorName
						})}
						value={createPositionData.name}
						onChange={(e) => onUpdateName(e.target.value)}
					/>
				</div>
			</div>

			<button
				className={styles.createButton}
				onClick={onCreate}
			>
				Создать
			</button>
		</Modal>
	);
};