import { TreeTableElementProcessTree } from '@features/process/ui/process-select/types/TreeTableElementProcess';

export function filterProcesses(data: TreeTableElementProcessTree[], search: string): TreeTableElementProcessTree[] {
	if (!search.trim()) return data;

	const lower = search.toLowerCase();

	return data
		.map((node) => {
			const match
                = node.title.toLowerCase().includes(lower);

			const filteredChildren = node.children
				? filterProcesses(node.children, search)
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
		.filter(Boolean) as TreeTableElementProcessTree[];
}