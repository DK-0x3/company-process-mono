import { canEditEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { positionActions } from '@entities/position/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { InputWithAddon } from '@shared/ui/input-with-addon/InputWithAddon';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';

import styles from './Header.module.scss';

interface HeaderProps {
	search: string;
	setSearch: (value: string) => void;
}

export const Header = ({ search, setSearch }: HeaderProps) => {
	const dispatch = useAppDispatch();
	const authUser = useAppSelector(selectAuthUser);
	const canEditPositions = canEditEntity(authUser, 'positions');
	
	const onCreateEmployee = () => {
		dispatch(positionActions.setIsActiveCreateModal(true));
	};
	
	return (
		<div className={styles.wrapper}>
			<div className={styles.actionButtons}>
				{canEditPositions && (
					<button onClick={onCreateEmployee}>
						Создать должность
					</button>
				)}
			</div>

			<InputWithAddon
				containerClassName={styles.search}
				inputClassName={styles.input}
				value={search}
				onChange={(e) => setSearch(e.target.value)}

				leftAddon={<SmartIcon iconName={'search'} className={styles.icon}/>}
			/>
		</div>
	);
};
