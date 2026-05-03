
import { Process } from '@entities/process/model/types/Process';
import { Task } from '@entities/task/model/types/Task';
import { filterProcessesAndTasks } from '@features/tree-table/helpers/filterProcessesAndTasks';
import { TreeTableElementProcessOrTasks } from '@features/tree-table/model/types/TreeTableElementProcessOrTasks';
import { Row } from '@features/tree-table/ui/row/Row';
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,	useReactTable 
} from '@tanstack/react-table';
import { useMemo } from 'react';

import styles from './TreeTableProcessAndTask.module.scss';

interface TreeTableProps {
    data: TreeTableElementProcessOrTasks[];
	search?: string;
	onClick?: (process: Process | null, task: Task | null) => void;
}

// eslint-disable-next-line react/function-component-definition
export function TreeTableProcessAndTask({
	data, search = '', onClick 
}: TreeTableProps) {
	const filteredData = useMemo(() => filterProcessesAndTasks(data, search), [data, search]);

	const columns = useMemo<ColumnDef<TreeTableElementProcessOrTasks>[]>(
		() => [
			{
				accessorKey: 'title',
				header: 'Название',
				cell: ({ row, getValue }) => {
					const isProcess = row.original.children !== null;
					const isEmpty = isProcess && row.original.children?.length === 0;

					return (
						<Row
							hasChildren={isProcess}
							getToggleExpandedHandler={row.getToggleExpandedHandler()}
							getIsExpanded={row.getIsExpanded}
							value={getValue<string>()}
							depth={row.depth}
							isEmpty={isEmpty}
							process={isProcess ? row.original.object as Process : undefined}
							task={!isProcess ? row.original.object as Task : undefined}
							onClick={onClick}
						/>
					);
				},
			},
		],
		[]
	);

	const table = useReactTable({
		data: filteredData,
		columns,
		getSubRows: (row) => row.children !== null ? row.children : undefined,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
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
								style={{ cursor: 'pointer' }}
							>
								{flexRender(header.column.columnDef.header, header.getContext())}
								{{
									asc: ' 🔼',
									desc: ' 🔽' 
								}[header.column.getIsSorted() as string] ?? ''}
							</th>
						))}
					</tr>
				))}
			</thead>

			<tbody>
				{table.getRowModel().rows.map((row) => (
					<tr key={row.id}>
						{row.getVisibleCells().map((cell) => (
							<td key={cell.id}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
};
