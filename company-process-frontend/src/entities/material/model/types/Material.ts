export interface MaterialCategory {
	id: number;
	name: string;
	description?: string | null;
	createdAt?: string;
	updatedAt?: string;
	_count?: {
		materials: number;
	};
}

export interface Material {
	id: number;
	name: string;
	content: string;
	categoryId: number;
	createdAt?: string;
	updatedAt?: string;
	category?: {
		id: number;
		name: string;
	};
	processMaterials?: Array<{
		id: number;
		processId: number;
		materialId: number;
		process?: {
			id: number;
			name: string;
		};
	}>;
	taskMaterials?: Array<{
		id: number;
		taskId: number;
		materialId: number;
		task?: {
			id: number;
			name: string;
			processId?: number;
		};
	}>;
	_count?: {
		processMaterials: number;
		taskMaterials: number;
	};
}
