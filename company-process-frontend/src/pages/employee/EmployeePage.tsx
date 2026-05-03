import { employeeAPI } from '@entities/employee/api/api';
import { employeeActions } from '@entities/employee/model/slice';
import { Employee } from '@entities/employee/model/types/Employee';
import { EmployeeTable } from '@features/employee-table/EmployeeTable';
import { Header } from '@pages/employee/ui/header/Header';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useState } from 'react';

import styles from './EmployeePage.module.scss';

export const EmployeePage = () => {
	const dispatch = useAppDispatch();
	
	const [search, setSearch] = useState<string>('');
	
	const { data: employees } = employeeAPI.useGetAllQuery();
	
	const onClickEmployee = (employee: Employee) => {
		dispatch(employeeActions.setViewData(employee));
		dispatch(employeeActions.setIsActiveViewModal(true));
	};
	
	return (
		<div className={styles.wrapper}>
			<Header search={search} setSearch={setSearch}/>

			<div className={styles.tableContainer}>
				<EmployeeTable 
					data={employees ?? []}
					search={search}
					onRowClick={onClickEmployee}
				/>
			</div>
		</div>
	);
};