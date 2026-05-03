import { positionAPI } from '@entities/position/api/api';
import { positionActions } from '@entities/position/model/slice';
import { Position } from '@entities/position/model/types/Position';
import { PositionList } from '@features/position/ui/position-list/PositionList';
import { Header } from '@pages/position/ui/header/Header';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useState } from 'react';

import styles from './PositionPage.module.scss';

export const PositionPage = () => {
	const dispatch = useAppDispatch();
	
	const [search, setSearch] = useState<string>('');
	
	const { data: positions } = positionAPI.useGetAllQuery();
	
	const onClickPosition = (position: Position) => {
		dispatch(positionActions.setViewData(position));
		dispatch(positionActions.setIsActiveViewModal(true));
	};
	
	return (
		<div className={styles.wrapper}>
			<Header search={search} setSearch={setSearch}/>

			<PositionList search={search} onClickPosition={onClickPosition} positions={positions ?? []} />
		</div>
	);
};
