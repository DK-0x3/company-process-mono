export interface DataObject {
	id: number;
	name: string;
	description: string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
	processData?: Array<{
		id: number;
		processId: number;
		type: 'input' | 'output';
		process?: {
			id: number;
			name: string;
		};
	}>;
	taskData?: Array<{
		id: number;
		taskId: number;
		type: 'input' | 'output';
		task?: {
			id: number;
			name: string;
		};
	}>;
}
