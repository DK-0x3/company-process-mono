import { Employee } from '@entities/employee/model/types/Employee';
import { Row } from '@features/employee-table/ui/row/Row';
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';

import styles from './EmployeeTable.module.scss';

interface EmployeeTableProps {
    data: Employee[];
    onRowClick?: (employee: Employee) => void;
    search?: string;
}

export const EmployeeTable = ({
	data, onRowClick, search = '' 
}: EmployeeTableProps) => {
	// Поиск по имени, email, телефону, должности
	const filteredData = useMemo(() => {
		const lower = search.toLowerCase().trim();
		if (!lower) return data;
		return data.filter(
			(emp) =>
				emp.fullName.toLowerCase().includes(lower)
                || emp.email.toLowerCase().includes(lower)
                || (emp.phone ?? '').toLowerCase().includes(lower)
                || (emp.position?.name ?? '').toLowerCase().includes(lower)
                || emp.userAccount?.login?.toLowerCase().includes(lower)
                || emp.userAccount?.visiblePassword?.toLowerCase().includes(lower)
		);
	}, [data, search]);

	// Определение колонок
	const columns = useMemo<ColumnDef<Employee>[]>(
		() => [
			{
				accessorKey: 'fullName',
				header: 'ФИО',
				cell: ({ row }) => (
					<Row employee={row.original} onClick={onRowClick}/>
				),
			},
			{
				accessorKey: 'position.name',
				header: 'Должность',
				cell: ({ row }) => row.original.position?.name ?? '—',
			},
			{
				accessorKey: 'email',
				header: 'Email',
			},
			{
				accessorKey: 'phone',
				header: 'Телефон',
			},
			{
				accessorKey: 'userAccount.login',
				header: 'Логин ЛК',
				cell: ({ row }) => row.original.userAccount?.login ?? '—',
			},
			{
				accessorKey: 'userAccount.visiblePassword',
				header: 'Пароль ЛК',
				cell: ({ row }) => row.original.userAccount?.visiblePassword ?? '—',
			},
		],
		[onRowClick]
	);

	const table = useReactTable({
		data: filteredData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<table className={styles.table}>
			<thead>
				{table.getHeaderGroups().map((headerGroup) => (
					<tr key={headerGroup.id}>
						{headerGroup.headers.map((header) => (
							<th
								key={header.id}
								onClick={header.column.getToggleSortingHandler()}
							>
								{flexRender(header.column.columnDef.header, header.getContext())}
								{header.column.getIsSorted() === 'asc'
									? ' 🔼'
									: header.column.getIsSorted() === 'desc'
										? ' 🔽'
										: ''}
							</th>
						))}
					</tr>
				))}
			</thead>

			<tbody>
				{table.getRowModel().rows.map((row) => (
					<tr
						key={row.id}
						style={{ cursor: onRowClick ? 'pointer' : 'default' }}
					>
						{row.getVisibleCells().map((cell) => (
							<td key={cell.id}>
								<div className={styles.cellWrapper}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</div>
							</td>
						))}
					</tr>
				))}

				{filteredData.length === 0 && (
					<tr>
						<td colSpan={columns.length} style={{
							textAlign: 'center',
							padding: '16px' 
						}}>
							Сотрудники не найдены
						</td>
					</tr>
				)}
			</tbody>
		</table>
	);
};
