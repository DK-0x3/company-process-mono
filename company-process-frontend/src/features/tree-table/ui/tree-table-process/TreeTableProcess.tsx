import { Process } from '@entities/process/model/types/Process';
import { TreeTableElementProcessTree } from '@features/process/ui/process-select/types/TreeTableElementProcess';
import { filterProcesses } from '@features/tree-table/helpers/filterProcesses';
import { Row } from '@features/tree-table/ui/row/Row';
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,	useReactTable 
} from '@tanstack/react-table';
import { useMemo } from 'react';

import styles from './TreeTableProcess.module.scss';

interface TreeTableProps {
    data: TreeTableElementProcessTree[];
	search?: string;
	onClickItem?: (process: Process | null) => void;
}

// eslint-disable-next-line react/function-component-definition
export function TreeTableProcess({
	data, search = '', onClickItem 
}: TreeTableProps) {
	const filteredData = useMemo(() => filterProcesses(data, search), [data, search]);

	const columns = useMemo<ColumnDef<TreeTableElementProcessTree>[]>(
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
							process={isProcess ? row.original.object : undefined}
							isEnableActions={false}
							onClick={(process) => onClickItem?.(process)}
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
