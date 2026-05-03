import { Position } from '@entities/position/model/types/Position';
import { ContextMenuPosition } from '@features/position/ui/position-list/context-menu-position/ContextMenuPosition';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { useRef, useState } from 'react';

import styles from './PositionItem.module.scss';

interface PositionItemProps {
    position: Position;
	onClickPosition: (position: Position) => void;
}

export const PositionItem = ({
	position, onClickPosition,
}: PositionItemProps) => {
	const iconRef = useRef<HTMLDivElement | null>(null);
	const [isOpenMenu, setIsOpenMenu] = useState<boolean>(false);
	
	return (
		<>
			<div key={position.id} className={styles.wrapper}>
				<div
					ref={iconRef}
					className={styles.iconLeft}
					onClick={() => {
						setIsOpenMenu((prev) => !prev);
					}}
				>
					<SmartIcon iconName={'dots-vertical'}/>
				</div>

				<span className={styles.title} onClick={() => onClickPosition(position)}>
					{position.name}
				</span>
			</div>

			<ContextMenuPosition
				ref={iconRef}
				isOpen={isOpenMenu}
				position={position}
				onClose={() => setIsOpenMenu(false)}
			/>
		</>
	);
};