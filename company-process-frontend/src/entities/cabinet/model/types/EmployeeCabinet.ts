export interface EmployeeCabinetResponse {
	employee: {
		id: number;
		fullName: string;
		email: string;
		phone: string | null;
		address: string | null;
		birthDate: string;
		hireDate: string;
		position: { id: number; name: string } | null;
		role: { id: number; name: string; description: string | null } | null;
	};
	summary: {
		responsibleProcesses: number;
		responsibleTasks: number;
	};
	permissions: {
		canViewProcesses: boolean;
		canEditProcesses: boolean;
		canViewTasks: boolean;
		canEditTasks: boolean;
		canViewPositions: boolean;
		canEditPositions: boolean;
		canViewDataObjects: boolean;
		canEditDataObjects: boolean;
		canViewMaterials: boolean;
		canEditMaterials: boolean;
		canViewTests: boolean;
		canEditTests: boolean;
	};
	processes: Array<{
		id: number;
		name: string;
		description: string | null;
		goal: string | null;
		version: number;
		isActive: boolean;
		updatedAt: string;
		responsible: string;
	}>;
	tasks: Array<{
		id: number;
		name: string;
		description: string | null;
		type: 'start' | 'end' | 'task' | 'decision' | 'parallel';
		processId: number;
		processName: string;
		updatedAt: string;
		responsible: string;
	}>;
}

export interface EmployeeCabinetProcessDetailsResponse {
	id: number;
	name: string;
	description: string | null;
	goal: string | null;
	version: number;
	isActive: boolean;
	updatedAt: string;
	responsible: string;
	inputs: Array<{ id: number; name: string; description: string | null }>;
	outputs: Array<{ id: number; name: string; description: string | null }>;
	tasks: Array<{
		id: number;
		name: string;
		type: 'start' | 'end' | 'task' | 'decision' | 'parallel';
		description: string | null;
		responsible: string;
	}>;
	participants: Array<{
		positionName: string;
		employees: Array<{ id: number; fullName: string; email: string }>;
	}>;
	materials: Array<{
		id: number;
		name: string;
		content: string;
		category: { id: number; name: string } | null;
		updatedAt: string;
	}>;
}

export interface EmployeeCabinetTaskDetailsResponse {
	id: number;
	name: string;
	description: string | null;
	type: 'start' | 'end' | 'task' | 'decision' | 'parallel';
	process: {
		id: number;
		name: string;
		description: string | null;
	};
	responsible: string;
	inputs: Array<{ id: number; name: string; description: string | null }>;
	outputs: Array<{ id: number; name: string; description: string | null }>;
	previousTasks: Array<{ id: number; name: string; type: 'start' | 'end' | 'task' | 'decision' | 'parallel' }>;
	nextTasks: Array<{ id: number; name: string; type: 'start' | 'end' | 'task' | 'decision' | 'parallel' }>;
	materials: Array<{
		id: number;
		name: string;
		content: string;
		category: { id: number; name: string } | null;
		updatedAt: string;
	}>;
}

export interface EmployeeCabinetTestListItem {
	id: number;
	name: string;
	description: string | null;
	timeLimitMinutes: number;
	createdAt: string;
	updatedAt: string;
	questions: Array<{
		id: number;
		type: 'single_choice' | 'multiple_choice' | 'text';
		title: string;
		description: string | null;
		order: number;
		isRequired: boolean;
		textAnswerPlaceholder: string | null;
		expectedTextAnswer: null;
		options: Array<{
			id: number;
			text: string;
			order: number;
		}>;
	}>;
	_count?: {
		employeeLinks: number;
		positionLinks: number;
		processLinks: number;
		taskLinks: number;
	};
	myResult?: EmployeeCabinetTestResultResponse | null;
}

export interface EmployeeCabinetTestResultResponse {
	id: number;
	testId: number;
	userId: number;
	score: number;
	correctAnswers: number;
	evaluatedQuestions: number;
	totalQuestions: number;
	percentage: number;
	durationSeconds: number | null;
	hintsUsed: number;
	hintsTotal: number;
	createdAt: string;
	updatedAt: string;
	answers: Array<{
		questionId: number;
		selectedOptionIds: number[];
		textAnswer: string | null;
		isCorrect: boolean | null;
		usedHint: boolean;
		question: {
			id: number;
			title: string;
			type: 'single_choice' | 'multiple_choice' | 'text';
			order: number;
		};
	}>;
}
