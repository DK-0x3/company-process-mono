import { Employee } from '@entities/employee/model/types/Employee';

export interface Role {
	id: number;
	name: string;
	description: string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
	employees?: Employee[];
	_count?: {
		responsibleForProcesses: number;
		responsibleForTasks: number;
	};
}
