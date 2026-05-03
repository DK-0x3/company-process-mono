import { canEditEntity, canViewEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { Process } from '@entities/process/model/types/Process';
import { Task } from '@entities/task/model/types/Task';
import { ChevronDown } from '@features/tree-table/ui/ChevronDownIcon';
import { ContextMenuProcess } from '@features/tree-table/ui/context-menu-process/ContextMenuProcess';
import { ContextMenuTask } from '@features/tree-table/ui/context-menu-task/ContextMenuTask';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { useRef, useState } from 'react';

import styles from './Row.module.scss';

interface RowProps {
	hasChildren: boolean;
	getToggleExpandedHandler: VoidFunction;
	getIsExpanded: () => boolean;
	value: string;
	depth: number;
	isEmpty: boolean;
	process?: Process;
	task?: Task;
	isEnableActions?: boolean;
	onClick?: (process: Process | null, task: Task | null) => void;
}

export const Row = ({
	hasChildren, 
	getToggleExpandedHandler, 
	getIsExpanded, 
	value, 
	depth,
	isEmpty,
	process,
	task,
	isEnableActions = true,
	onClick,
}: RowProps) => {
	const iconRef = useRef<HTMLDivElement | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const authUser = useAppSelector(selectAuthUser);
	const canShowProcessActions = canViewEntity(authUser, 'processes');
	const canShowTaskActions = canEditEntity(authUser, 'tasks');
	const canShowActions = isEnableActions && (hasChildren ? canShowProcessActions : canShowTaskActions);
	
	const onClickTitle = () => {
		onClick?.(process ?? null, task ?? null);
	};
	
	return (
		<div className={styles.cellWrapper} style={{ paddingLeft: `${depth * 20}px` }}>
			{canShowActions && <div
				ref={iconRef}
				className={styles.iconLeft}
				onClick={() => setMenuOpen((prev) => !prev)}
			>
				<SmartIcon iconName={'dots-vertical'}/>
			</div>}

			{hasChildren && (
				<button
					onClick={getToggleExpandedHandler}
					className={styles.toggle}
				>
					{ !isEmpty && <ChevronDown rotated={getIsExpanded() ? 0 : -90}/>}
					<SmartIcon className={styles.icon} iconName={'folder'} />
				</button>
			)}

			<span
				className={styles.title}
				style={{ marginLeft: hasChildren ? 0 : 30 }}
				onClick={onClickTitle}
			>
				{value}
			</span>

			{/* Контекстное меню */}
			{canShowActions && (
				hasChildren ? <ContextMenuProcess
					isOpen={menuOpen}
					onClose={() => setMenuOpen(false)}
					ref={iconRef}
					process={process}
				/> : <ContextMenuTask
					isOpen={menuOpen}
					onClose={() => setMenuOpen(false)}
					ref={iconRef}
					task={task}
				/>
			)}
		</div>
	);
};
