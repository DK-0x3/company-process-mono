import { employeeAPI } from '@entities/employee/api/api';
import { positionAPI } from '@entities/position/api/api';
import { processAPI } from '@entities/process/api/api';
import { taskAPI } from '@entities/task/api/api';
import { mapQuestionToPayload } from '@entities/test/api/types';
import { testAPI } from '@entities/test/api/api';
import { TestQuestion, TestQuestionType } from '@entities/test/model/types/Test';
import { skipToken } from '@reduxjs/toolkit/query';
import routes from '@shared/config/routes';
import { MultiSelectDropDown } from '@shared/ui/drop-down-menu/MultiSelectDropDown';
import { useEffect, useMemo, useState } from 'react';
import MDEditor, { commands, ICommand, TextAreaTextApi, TextState } from '@uiw/react-md-editor';
import remarkGfm from 'remark-gfm';
import { useNavigate, useParams } from 'react-router-dom';

import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

import styles from './TestEditorPage.module.scss';

const createEmptyOption = (order: number) => ({
	text: '',
	isCorrect: false,
	order,
});

const createQuestionTemplate = (order: number): TestQuestion => ({
	type: 'single_choice',
	title: '',
	description: '',
	order,
	isRequired: true,
	textAnswerPlaceholder: '',
	expectedTextAnswer: '',
	options: [createEmptyOption(1), createEmptyOption(2)],
});

const questionTypeLabel: Record<TestQuestionType, string> = {
	single_choice: 'Одиночный выбор',
	multiple_choice: 'Множественный выбор',
	text: 'Текстовый ответ',
};

const videoCommand: ICommand = {
	name: 'insert-video',
	keyCommand: 'insert-video',
	buttonProps: { 'aria-label': 'Вставить видео' },
	icon: <span className={styles.toolbarText}>Видео</span>,
	execute: (_state: TextState, api: TextAreaTextApi) => {
		api.replaceSelection(
			'\n<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n',
		);
	},
};

const markdownCommands: ICommand[] = [
	commands.group([
		commands.title1,
		commands.title2,
		commands.title3,
		commands.title4,
	], {
		name: 'title',
		groupName: 'title',
		buttonProps: { 'aria-label': 'Заголовки' },
	}),
	commands.bold,
	commands.italic,
	commands.strikethrough,
	commands.hr,
	commands.divider,
	commands.link,
	commands.image,
	videoCommand,
	commands.divider,
	commands.quote,
	commands.unorderedListCommand,
	commands.orderedListCommand,
	commands.checkedListCommand,
	commands.divider,
	commands.code,
	commands.codeBlock,
];

export const TestEditorPage = () => {
	const navigate = useNavigate();
	const params = useParams<{ testId?: string }>();
	const testId = params.testId ? Number(params.testId) : undefined;
	const isEditMode = Boolean(testId);

	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
	const [questions, setQuestions] = useState<TestQuestion[]>([createQuestionTemplate(1)]);

	const [employeeIds, setEmployeeIds] = useState<number[]>([]);
	const [positionIds, setPositionIds] = useState<number[]>([]);
	const [processIds, setProcessIds] = useState<number[]>([]);
	const [taskIds, setTaskIds] = useState<number[]>([]);

	const { data: employees } = employeeAPI.useGetAllQuery();
	const { data: positions } = positionAPI.useGetAllQuery();
	const { data: processes } = processAPI.useGetAllFlatQuery();
	const { data: tasks } = taskAPI.useGetAllQuery();
	const { data: test } = testAPI.useGetByIdQuery(
		testId ? { id: testId } : skipToken,
	);

	const [createTest, { isLoading: isCreating }] = testAPI.useCreateMutation();
	const [updateTest, { isLoading: isUpdating }] = testAPI.useUpdateMutation();

	useEffect(() => {
		if (!test || !isEditMode) return;

		setName(test.name);
		setDescription(test.description ?? '');
		setTimeLimitMinutes(test.timeLimitMinutes);
		setQuestions(
			test.questions.length > 0
				? test.questions.map((question, index) => ({
					...question,
					order: index + 1,
					options: (question.options ?? []).map((option, optionIndex) => ({
						...option,
						order: optionIndex + 1,
					})),
				}))
				: [createQuestionTemplate(1)],
		);
		setEmployeeIds((test.employeeLinks ?? []).map((item) => item.employeeId));
		setPositionIds((test.positionLinks ?? []).map((item) => item.positionId));
		setProcessIds((test.processLinks ?? []).map((item) => item.processId));
		setTaskIds((test.taskLinks ?? []).map((item) => item.taskId));
	}, [test, isEditMode]);

	const employeeOptions = useMemo(
		() => (employees ?? []).map((employee) => ({
			value: employee.id,
			label: employee.fullName,
			description: employee.position?.name ?? employee.email,
		})),
		[employees],
	);

	const positionOptions = useMemo(
		() => (positions ?? []).map((position) => ({
			value: position.id,
			label: position.name,
			description: `Сотрудников: ${position.employees?.length ?? 0}`,
		})),
		[positions],
	);

	const processOptions = useMemo(
		() => (processes ?? []).map((process) => ({
			value: process.id,
			label: process.name,
			description: process.goal ?? process.description ?? 'Без цели',
		})),
		[processes],
	);

	const taskOptions = useMemo(
		() => (tasks ?? []).map((task) => ({
			value: task.id,
			label: task.name,
			description: `Процесс #${task.processId}`,
		})),
		[tasks],
	);

	const setQuestionField = <K extends keyof TestQuestion>(questionIndex: number, field: K, value: TestQuestion[K]) => {
		setQuestions((prev) => prev.map((question, index) => {
			if (index !== questionIndex) return question;

			if (field === 'type') {
				const nextType = value as TestQuestionType;
				if (nextType === 'text') {
					return {
						...question,
						type: nextType,
						options: [],
					};
				}

				return {
					...question,
					type: nextType,
					options: question.options.length >= 2
						? question.options
						: [createEmptyOption(1), createEmptyOption(2)],
				};
			}

			return {
				...question,
				[field]: value,
			};
		}));
	};

	const addQuestion = () => {
		setQuestions((prev) => [...prev, createQuestionTemplate(prev.length + 1)]);
	};

	const removeQuestion = (questionIndex: number) => {
		setQuestions((prev) => prev
			.filter((_, index) => index !== questionIndex)
			.map((question, index) => ({ ...question, order: index + 1 })));
	};

	const addOption = (questionIndex: number) => {
		setQuestions((prev) => prev.map((question, index) => {
			if (index !== questionIndex) return question;
			return {
				...question,
				options: [...question.options, createEmptyOption(question.options.length + 1)],
			};
		}));
	};

	const removeOption = (questionIndex: number, optionIndex: number) => {
		setQuestions((prev) => prev.map((question, qIndex) => {
			if (qIndex !== questionIndex) return question;
			const nextOptions = question.options
				.filter((_, oIndex) => oIndex !== optionIndex)
				.map((option, index) => ({ ...option, order: index + 1 }));

			return {
				...question,
				options: nextOptions,
			};
		}));
	};

	const setOptionField = (
		questionIndex: number,
		optionIndex: number,
		field: 'text' | 'isCorrect',
		value: string | boolean,
	) => {
		setQuestions((prev) => prev.map((question, qIndex) => {
			if (qIndex !== questionIndex) return question;

			const nextOptions = question.options.map((option, oIndex) => {
				if (oIndex !== optionIndex) return option;
				return {
					...option,
					[field]: value,
				};
			});

			if (field === 'isCorrect' && value === true && question.type === 'single_choice') {
				return {
					...question,
					options: nextOptions.map((option, index) => ({
						...option,
						isCorrect: index === optionIndex,
					})),
				};
			}

			return {
				...question,
				options: nextOptions,
			};
		}));
	};

	const validateBeforeSubmit = () => {
		if (!name.trim()) {
			alert('Заполните название теста');
			return false;
		}
		if (timeLimitMinutes <= 0) {
			alert('Время выполнения должно быть больше 0 минут');
			return false;
		}
		if (questions.length === 0) {
			alert('Добавьте хотя бы один вопрос');
			return false;
		}

		for (let index = 0; index < questions.length; index += 1) {
			const question = questions[index];
			if (!question.title.trim()) {
				alert(`Вопрос #${index + 1}: заполните текст вопроса`);
				return false;
			}

			if (question.type !== 'text') {
				if (question.options.length < 2) {
					alert(`Вопрос #${index + 1}: нужно минимум 2 варианта ответа`);
					return false;
				}

				const emptyOption = question.options.find((option) => !option.text.trim());
				if (emptyOption) {
					alert(`Вопрос #${index + 1}: один из вариантов ответа пустой`);
					return false;
				}

				const correctCount = question.options.filter((option) => option.isCorrect).length;
				if (question.type === 'single_choice' && correctCount !== 1) {
					alert(`Вопрос #${index + 1}: для одиночного выбора отметьте ровно 1 правильный вариант`);
					return false;
				}
				if (question.type === 'multiple_choice' && correctCount < 1) {
					alert(`Вопрос #${index + 1}: для множественного выбора отметьте хотя бы 1 правильный вариант`);
					return false;
				}
			}
		}

		return true;
	};

	const onSubmit = async () => {
		if (!validateBeforeSubmit()) return;

		const payload = {
			name: name.trim(),
			description: description.trim() || undefined,
			timeLimitMinutes,
			questions: questions.map((question, index) => mapQuestionToPayload({
				...question,
				order: index + 1,
				options: question.options.map((option, optionIndex) => ({
					...option,
					order: optionIndex + 1,
				})),
			})),
			employeeIds,
			positionIds,
			processIds,
			taskIds,
		};

		try {
			if (isEditMode && testId) {
				await updateTest({ id: testId, ...payload }).unwrap();
			} else {
				await createTest(payload).unwrap();
			}
			navigate(routes.TEST);
		} catch (error: any) {
			const message = error?.data?.message ?? 'Не удалось сохранить тест';
			alert(Array.isArray(message) ? message.join('\n') : message);
		}
	};

	return (
		<div className={styles.wrapper}>
			<div className={styles.header}>
				<div>
					<h1 className={styles.title}>{isEditMode ? 'Редактирование теста' : 'Создание теста'}</h1>
					<p className={styles.subtitle}>Соберите вопросы и назначьте тест нужным сотрудникам и объектам.</p>
				</div>
				<div className={styles.headerActions}>
					<button className={styles.secondaryButton} onClick={() => navigate(routes.TEST)}>К списку</button>
					<button className={styles.primaryButton} onClick={onSubmit} disabled={isCreating || isUpdating}>
						{isEditMode ? (isUpdating ? 'Сохранение...' : 'Сохранить') : (isCreating ? 'Создание...' : 'Создать')}
					</button>
				</div>
			</div>

			<div className={styles.card}>
				<div className={styles.formGrid}>
					<div>
						<label>Название теста</label>
						<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например: Базовый тест по процессу разработки" />
					</div>
					<div>
						<label>Время на выполнение (минуты)</label>
						<input
							type="number"
							min={1}
							value={timeLimitMinutes}
							onChange={(event) => setTimeLimitMinutes(Number(event.target.value) || 0)}
						/>
					</div>
				</div>

					<div>
						<label>Описание (опционально)</label>
						<textarea
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						placeholder="Контекст теста, правила прохождения, критерии"
					/>
				</div>

				<div className={styles.bindingsGrid}>
					<div className={styles.bindingItem}>
						<label>Сотрудники</label>
						<MultiSelectDropDown
							items={employeeOptions}
							selectedValues={employeeIds}
							onChange={setEmployeeIds}
							placeholder="Выберите сотрудников"
						/>
					</div>
					<div className={styles.bindingItem}>
						<label>Должности</label>
						<MultiSelectDropDown
							items={positionOptions}
							selectedValues={positionIds}
							onChange={setPositionIds}
							placeholder="Выберите должности"
						/>
					</div>
					<div className={styles.bindingItem}>
						<label>Процессы</label>
						<MultiSelectDropDown
							items={processOptions}
							selectedValues={processIds}
							onChange={setProcessIds}
							placeholder="Выберите процессы"
						/>
					</div>
					<div className={styles.bindingItem}>
						<label>Задачи</label>
						<MultiSelectDropDown
							items={taskOptions}
							selectedValues={taskIds}
							onChange={setTaskIds}
							placeholder="Выберите задачи"
						/>
					</div>
				</div>
			</div>

			<div className={styles.card}>
				<div className={styles.cardHeader}>
					<h2>Вопросы теста</h2>
					<button className={styles.secondaryButton} onClick={addQuestion}>Добавить вопрос</button>
				</div>

				<div className={styles.questionsList}>
					{questions.map((question, questionIndex) => (
						<div key={`question-${questionIndex}`} className={styles.questionCard}>
							<div className={styles.questionHeaderRow}>
								<div className={styles.questionHeaderLeft}>
									<strong>Вопрос #{questionIndex + 1}</strong>
									<span>{questionTypeLabel[question.type]}</span>
								</div>
								{questions.length > 1 && (
									<button className={styles.dangerButton} onClick={() => removeQuestion(questionIndex)}>Удалить вопрос</button>
								)}
							</div>

							<div className={styles.formGrid}>
								<div>
									<label>Тип вопроса</label>
									<select
										value={question.type}
										onChange={(event) => setQuestionField(questionIndex, 'type', event.target.value as TestQuestionType)}
									>
										<option value="single_choice">Одиночный выбор</option>
										<option value="multiple_choice">Множественный выбор</option>
										<option value="text">Текстовый ответ</option>
									</select>
								</div>

								<div>
									<label>Обязательный вопрос</label>
									<select
										value={question.isRequired ? 'required' : 'optional'}
										onChange={(event) => setQuestionField(questionIndex, 'isRequired', event.target.value === 'required')}
									>
										<option value="required">Да</option>
										<option value="optional">Нет</option>
									</select>
								</div>
							</div>

							<div className={styles.markdownField}>
								<label>Текст вопроса (markdown + toolbar + preview)</label>
								<div data-color-mode="light" className={styles.markdownEditor}>
									<MDEditor
										value={question.title}
										onChange={(value) => setQuestionField(questionIndex, 'title', value ?? '')}
										preview="live"
										height={220}
										commands={markdownCommands}
										extraCommands={[
											commands.codeEdit,
											commands.codeLive,
											commands.codePreview,
											commands.fullscreen,
										]}
										previewOptions={{
											remarkPlugins: [remarkGfm],
										}}
									/>
								</div>
							</div>

							<div className={styles.markdownField}>
								<label>Подсказка/детали (markdown, опционально)</label>
								<div data-color-mode="light" className={styles.markdownEditor}>
									<MDEditor
										value={question.description ?? ''}
										onChange={(value) => setQuestionField(questionIndex, 'description', value ?? '')}
										preview="live"
										height={180}
										commands={markdownCommands}
										extraCommands={[
											commands.codeEdit,
											commands.codeLive,
											commands.codePreview,
										]}
										previewOptions={{
											remarkPlugins: [remarkGfm],
										}}
									/>
								</div>
							</div>

							{question.type === 'text' ? (
								<div className={styles.textAnswerFields}>
									<div>
										<label>Placeholder для ответа</label>
										<input
											value={question.textAnswerPlaceholder ?? ''}
											onChange={(event) => setQuestionField(questionIndex, 'textAnswerPlaceholder', event.target.value)}
											placeholder="Введите ваш ответ..."
										/>
									</div>
									<div>
										<label>Ожидаемый ответ (опционально)</label>
										<textarea
											value={question.expectedTextAnswer ?? ''}
											onChange={(event) => setQuestionField(questionIndex, 'expectedTextAnswer', event.target.value)}
											placeholder="Эталон/критерии ответа"
										/>
									</div>
								</div>
							) : (
								<div className={styles.optionsSection}>
									<div className={styles.optionsHeader}>
										<strong>Варианты ответа</strong>
										<button className={styles.secondaryButton} onClick={() => addOption(questionIndex)}>
											Добавить вариант
										</button>
									</div>

									{question.options.map((option, optionIndex) => (
										<div key={`option-${questionIndex}-${optionIndex}`} className={styles.optionRow}>
											<label className={styles.answerToggle}>
												<input
													className={styles.answerToggleInput}
													type={question.type === 'single_choice' ? 'radio' : 'checkbox'}
													name={`correct-${questionIndex}`}
													checked={option.isCorrect}
													onChange={(event) => setOptionField(questionIndex, optionIndex, 'isCorrect', event.target.checked)}
												/>
												<span
													className={`${styles.answerToggleControl} ${question.type === 'single_choice' ? styles.answerToggleControlRadio : ''}`}
													aria-hidden
												/>
											</label>
											<input
												value={option.text}
												onChange={(event) => setOptionField(questionIndex, optionIndex, 'text', event.target.value)}
												placeholder={`Вариант ${optionIndex + 1}`}
											/>
											<button
												className={styles.optionDeleteButton}
												onClick={() => removeOption(questionIndex, optionIndex)}
												disabled={question.options.length <= 2}
											>
												Удалить
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					))}
				</div>

				<div className={styles.bottomAddQuestion}>
					<button className={styles.secondaryButton} onClick={addQuestion}>Добавить вопрос</button>
				</div>
			</div>
		</div>
	);
};
