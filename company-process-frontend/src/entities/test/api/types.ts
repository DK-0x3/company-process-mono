import { Test, TestQuestion, TestQuestionType, TestResult } from '@entities/test/model/types/Test';

export interface TestQuestionOptionPayload {
	text: string;
	isCorrect?: boolean;
	order?: number;
}

export interface TestQuestionPayload {
	type: TestQuestionType;
	title: string;
	description?: string;
	order?: number;
	isRequired?: boolean;
	textAnswerPlaceholder?: string;
	expectedTextAnswer?: string;
	options?: TestQuestionOptionPayload[];
}

export interface CreateTestRequest {
	name: string;
	description?: string;
	timeLimitMinutes: number;
	questions: TestQuestionPayload[];
	employeeIds?: number[];
	positionIds?: number[];
	processIds?: number[];
	taskIds?: number[];
}

export type CreateTestResponse = Test;

export type GetAllTestsResponse = Test[];

export interface GetByIdTestRequest {
	id: number;
}

export type GetByIdTestResponse = Test;

export interface UpdateTestRequest {
	id: number;
	name?: string;
	description?: string;
	timeLimitMinutes?: number;
	questions?: TestQuestionPayload[];
	employeeIds?: number[];
	positionIds?: number[];
	processIds?: number[];
	taskIds?: number[];
}

export type UpdateTestResponse = Test;

export interface DeleteTestRequest {
	id: number;
}

export interface SubmitTestAnswerPayload {
	questionId: number;
	selectedOptionIds?: number[];
	textAnswer?: string;
	usedHint?: boolean;
}

export interface SubmitTestRequest {
	id: number;
	answers: SubmitTestAnswerPayload[];
	durationSeconds?: number;
}

export type SubmitTestResponse = TestResult;

export interface GetMyTestResultRequest {
	id: number;
}

export type GetMyTestResultResponse = TestResult | null;

export interface GetTestStatsRequest {
	id: number;
}

export interface GetTestStatsResponse {
	test: {
		id: number;
		name: string;
		description: string | null;
		timeLimitMinutes: number;
		createdAt: string;
		updatedAt: string;
		questionStats: {
			total: number;
			required: number;
			byType: {
				single_choice: number;
				multiple_choice: number;
				text: number;
			};
		};
		links: {
			employees: Array<{ id: number; fullName: string }>;
			positions: Array<{ id: number; name: string }>;
			processes: Array<{ id: number; name: string }>;
			tasks: Array<{ id: number; name: string; processId: number }>;
		};
	};
	assignment: {
		assignedEmployeesCount: number;
		passedEmployeesCount: number;
		notPassedEmployeesCount: number;
		assignedEmployees: Array<{
			employee: {
				id: number;
				fullName: string;
				email: string;
				position: { id: number; name: string } | null;
				account: { id: number; login: string; email: string } | null;
			};
			assignmentReasons: {
				byDirectLink: boolean;
				byPositionLink: boolean;
				byProcesses: Array<{ id: number; name: string }>;
				byTasks: Array<{ id: number; name: string }>;
			};
			hasPassed: boolean;
			result: {
				id: number;
				score: number;
				correctAnswers: number;
				evaluatedQuestions: number;
				totalQuestions: number;
				percentage: number;
				durationSeconds: number | null;
				hintsUsed: number;
				hintsTotal: number;
				updatedAt: string;
			} | null;
		}>;
	};
	summary: {
		totalResults: number;
		averagePercentage: number;
		maxPercentage: number;
		minPercentage: number;
	};
	results: Array<{
		id: number;
		userId: number;
		user: {
			id: number;
			login: string;
			email: string;
			actorType: 'OWNER' | 'EMPLOYEE';
			employeeProfile: {
				id: number;
				fullName: string;
				email: string;
				position: { id: number; name: string } | null;
			} | null;
		};
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
			questionOrder: number;
			questionTitle: string;
			questionType: TestQuestionType;
			selectedOptionIds: number[];
			textAnswer: string | null;
			isCorrect: boolean | null;
			usedHint: boolean;
		}>;
	}>;
}

export const mapQuestionToPayload = (question: TestQuestion): TestQuestionPayload => ({
	type: question.type,
	title: question.title,
	description: question.description ?? undefined,
	order: question.order,
	isRequired: question.isRequired,
	textAnswerPlaceholder: question.textAnswerPlaceholder ?? undefined,
	expectedTextAnswer: question.expectedTextAnswer ?? undefined,
	options: question.options.map((option) => ({
		text: option.text,
		isCorrect: option.isCorrect,
		order: option.order,
	})),
});
