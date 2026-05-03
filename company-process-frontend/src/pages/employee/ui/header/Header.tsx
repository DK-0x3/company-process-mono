import { employeeActions } from '@entities/employee/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { InputWithAddon } from '@shared/ui/input-with-addon/InputWithAddon';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';

import styles from './Header.module.scss';

interface HeaderProps {
	search: string;
	setSearch: (value: string) => void;
}

export const Header = ({ search, setSearch }: HeaderProps) => {
	const dispatch = useAppDispatch();
	
	const onCreateEmployee = () => {
		dispatch(employeeActions.setIsActiveCreateModal(true));
	};
	
	return (
		<div className={styles.wrapper}>
			<div className={styles.actionButtons}>
				<button onClick={onCreateEmployee}>
					Создать сотрудника
				</button>
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