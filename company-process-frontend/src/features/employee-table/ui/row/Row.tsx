import { Employee } from '@entities/employee/model/types/Employee';
import { ContextMenuEmployee } from '@features/employee-table/ui/context-menu-employee/ContextMenuEmployee';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { useRef, useState } from 'react';

import styles from './Row.module.scss';

interface RowProps {
	employee: Employee;
	onClick?: (employee: Employee) => void;
}

export const Row = ({
	employee,
	onClick,
}: RowProps) => {
	const iconRef = useRef<HTMLDivElement | null>(null);

	const [menuOpen, setMenuOpen] = useState(false);
	
	const onClickTitle = () => {
		onClick?.(employee);
	};
	
	return (
		<div className={styles.cellWrapper}>
			<div
				ref={iconRef}
				className={styles.iconLeft}
				onClick={() => {
					setMenuOpen((prev) => !prev);
				}}
			>
				<SmartIcon iconName={'dots-vertical'}/>
			</div>

			<span
				className={styles.title}
				onClick={onClickTitle}
			>
				{employee.fullName}
			</span>

			{/* Контекстное меню */}
			<ContextMenuEmployee
				isOpen={menuOpen}
				onClose={() => setMenuOpen(false)}
				ref={iconRef}
				employee={employee}
			/>
		</div>
	);
};