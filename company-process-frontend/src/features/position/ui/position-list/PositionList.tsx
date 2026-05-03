import { Position } from '@entities/position/model/types/Position';
import { PositionItem } from '@features/position/ui/position-list/position-item/PositionItem';

import styles from './PositionList.module.scss';

interface PositionListProps {
    positions: Position[];
	onClickPosition: (position: Position) => void;
	search: string;
}

export const PositionList = (
	{
		positions, onClickPosition, search,
	}: PositionListProps) => {
	return (
		<div className={styles.wrapper}>
			{
				positions.filter((p) => p.name.includes(search)).map((position) => (
					<PositionItem onClickPosition={onClickPosition} key={position.id} position={position}/>
				))
			}
		</div>
	);
};