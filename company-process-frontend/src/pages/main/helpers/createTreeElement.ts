import { ProcessTree } from '@entities/process/model/types/ProcessTree';
import { TreeTableElementProcessOrTasks } from '@features/tree-table/model/types/TreeTableElementProcessOrTasks';

let treeId = 1;

export const createTreeElement = (process: ProcessTree): TreeTableElementProcessOrTasks => {
	const newElement: TreeTableElementProcessOrTasks = {
		id: treeId,
		title: process.name,
		object: {
			...process,
		},
		children: [],
	};
	treeId++;
	
	if (process.children && process.children.length > 0) {
		process.children.forEach((element) => {
			newElement.children?.push(createTreeElement(element));
		});
	}
	
	if (process.tasks.length > 0) {
		process.tasks.forEach((task) => {
			const element: TreeTableElementProcessOrTasks = {
				id: treeId,
				title: task.name,
				object: {
					...task,
				},
				children: null,
			};
			treeId++;

			newElement.children?.push(element);
		});
	}

	return newElement;
};