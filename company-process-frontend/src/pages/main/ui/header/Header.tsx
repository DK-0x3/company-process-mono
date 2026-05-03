import { canEditEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { processActions } from '@entities/process/model/slice';
import { taskActions } from '@entities/task/model/slice';
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
	const dispacth = useAppDispatch();
	const authUser = useAppSelector(selectAuthUser);
	const canEditProcesses = canEditEntity(authUser, 'processes');
	const canEditTasks = canEditEntity(authUser, 'tasks');
	
	const onCreateProcess = () => {
		dispacth(processActions.setIsActiveCreateModal(true));
	};

	const onCreateTask = () => {
		dispacth(taskActions.setIsActiveCreateModal(true));
	};
	
	return (
		<div className={styles.wrapper}>
			<div className={styles.actionButtons}>
				{canEditProcesses && (
					<button onClick={onCreateProcess}>
						Создать процесс
					</button>
				)}

				{canEditTasks && (
					<button onClick={onCreateTask}>
						Создать задачу
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
