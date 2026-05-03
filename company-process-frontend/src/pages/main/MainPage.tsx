import { processAPI } from '@entities/process/api/api';
import { processActions } from '@entities/process/model/slice';
import { Process } from '@entities/process/model/types/Process';
import { taskActions } from '@entities/task/model/slice';
import { Task } from '@entities/task/model/types/Task';
import { TreeTableElementProcessOrTasks } from '@features/tree-table/model/types/TreeTableElementProcessOrTasks';
import { TreeTableProcessAndTask } from '@features/tree-table/ui/tree-table-process-and-task/TreeTableProcessAndTask';
import { createTreeElement } from '@pages/main/helpers/createTreeElement';
import { Header } from '@pages/main/ui/header/Header';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useEffect, useState } from 'react';

import styles from './MainPage.module.scss';

export const MainPage = () => {
	const dispatch = useAppDispatch();
	
	const [search, setSearch] = useState<string>('');
	const [tableElements, setTableElements] = useState<TreeTableElementProcessOrTasks[]>([]);
	
	const { data } = processAPI.useGetAllTreeQuery();

	useEffect(() => {
		if (!data) return;
		
		const resultElements: TreeTableElementProcessOrTasks[] = [];
		
		data.forEach((p) => {
			resultElements.push(createTreeElement(p));
		});

		setTableElements(resultElements);
	}, [data]);
	
	const onClickItemTreeTable = (process: Process | null, task: Task | null) => {
		if (process) {
			dispatch(processActions.setViewProcessData(process));
			dispatch(processActions.setIsActiveViewModal(true));
		}
		
		if (task) {
			dispatch(taskActions.setViewData(task));
			dispatch(taskActions.setIsActiveViewModal(true));
		}
	};

	return (
		<div className={styles.wrapper}>
			<Header search={search} setSearch={setSearch}/>

			<div className={styles.tableContainer}>
				<TreeTableProcessAndTask
					data={tableElements}
					search={search}
					onClick={onClickItemTreeTable}
				/>
			</div>
		</div>
	);
};