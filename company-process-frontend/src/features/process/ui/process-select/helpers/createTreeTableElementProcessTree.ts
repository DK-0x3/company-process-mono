import { ProcessTree } from '@entities/process/model/types/ProcessTree';
import { TreeTableElementProcessTree } from '@features/process/ui/process-select/types/TreeTableElementProcess';

export const createTreeTableElementProcessTree = (process: ProcessTree): TreeTableElementProcessTree => {
	const newElement: TreeTableElementProcessTree = {
		id: process.id,
		title: process.name,
		object: {
			...process,
		},
		children: [],
	};

	if (process.children && process.children.length > 0) {
		process.children.forEach((element) => {
			newElement.children?.push(createTreeTableElementProcessTree(element));
		});
	}

	return newElement;
};