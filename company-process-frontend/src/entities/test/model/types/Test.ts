export type TestQuestionType = 'single_choice' | 'multiple_choice' | 'text';

export interface TestQuestionOption {
	id?: number;
	text: string;
	isCorrect: boolean;
	order: number;
}

export interface TestQuestion {
	id?: number;
	type: TestQuestionType;
	title: string;
	description?: string | null;
	order: number;
	isRequired: boolean;
	textAnswerPlaceholder?: string | null;
	expectedTextAnswer?: string | null;
	options: TestQuestionOption[];
}

export interface Test {
	id: number;
	name: string;
	description?: string | null;
	timeLimitMinutes: number;
	createdAt?: string;
	updatedAt?: string;
	questions: TestQuestion[];
	employeeLinks?: Array<{
		id: number;
		employeeId: number;
		employee?: {
			id: number;
			fullName: string;
			email: string;
		};
	}>;
	positionLinks?: Array<{
		id: number;
		positionId: number;
		position?: {
			id: number;
			name: string;
		};
	}>;
	processLinks?: Array<{
		id: number;
		processId: number;
		process?: {
			id: number;
			name: string;
		};
	}>;
	taskLinks?: Array<{
		id: number;
		taskId: number;
		task?: {
			id: number;
			name: string;
			processId?: number;
		};
	}>;
	_count?: {
		employeeLinks: number;
		positionLinks: number;
		processLinks: number;
		taskLinks: number;
	};
}

export interface TestResultAnswer {
	questionId: number;
	selectedOptionIds: number[];
	textAnswer?: string | null;
	isCorrect?: boolean | null;
	usedHint?: boolean;
	isEvaluated?: boolean;
	question?: {
		id: number;
		title: string;
		type: TestQuestionType;
		order: number;
	};
}

export interface TestResult {
	id: number;
	testId: number;
	userId: number;
	score: number;
	correctAnswers: number;
	evaluatedQuestions: number;
	totalQuestions: number;
	percentage: number;
	durationSeconds?: number | null;
	hintsUsed?: number;
	hintsTotal?: number;
	createdAt?: string;
	updatedAt?: string;
	answers: TestResultAnswer[];
	test?: {
		id: number;
		name: string;
		timeLimitMinutes: number;
	};
	submittedAt?: string;
}
