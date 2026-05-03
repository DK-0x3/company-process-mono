import { TreeTableElementProcessOrTasks } from '@features/tree-table/model/types/TreeTableElementProcessOrTasks';

// eslint-disable-next-line max-len
export function filterProcessesAndTasks(data: TreeTableElementProcessOrTasks[], search: string): TreeTableElementProcessOrTasks[] {
	if (!search.trim()) return data;

	const lower = search.toLowerCase();

	return data
		.map((node) => {
			const match
                = node.title.toLowerCase().includes(lower);

			const filteredChildren = node.children
				? filterProcessesAndTasks(node.children, search)
				: [];

			// если узел совпадает или есть совпадение в потомках — возвращаем его
			if (match || filteredChildren.length > 0) {
				return {
					...node,
					children: filteredChildren
				};
			}

			return null;
		})
		.filter(Boolean) as TreeTableElementProcessOrTasks[];
}