import { testAPI } from '@entities/test/api/api';
import { TestResult } from '@entities/test/model/types/Test';
import { skipToken } from '@reduxjs/toolkit/query';
import routes from '@shared/config/routes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import styles from './TestPassPage.module.scss';

interface AnswerState {
	selectedOptionIds: number[];
	textAnswer: string;
	usedHint: boolean;
}

const formatDate = (value?: string) => {
	if (!value) return '-';
	return new Date(value).toLocaleString('ru-RU', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
};

const formatTimer = (seconds: number) => {
	const safe = Math.max(0, seconds);
	const m = Math.floor(safe / 60).toString().padStart(2, '0');
	const s = (safe % 60).toString().padStart(2, '0');
	return `${m}:${s}`;
};

const toAnswerStateMap = (questionIds: number[]) => {
	const map: Record<number, AnswerState> = {};
	questionIds.forEach((id) => {
		map[id] = {
			selectedOptionIds: [],
			textAnswer: '',
			usedHint: false,
		};
	});
	return map;
};

export const TestPassPage = () => {
	const navigate = useNavigate();
	const params = useParams<{ testId?: string }>();
	const testId = params.testId ? Number(params.testId) : undefined;

	const { data: test, isLoading: isLoadingTest } = testAPI.useGetByIdQuery(
		testId ? { id: testId } : skipToken,
	);
	const {
		data: myResult,
		isLoading: isLoadingResult,
		refetch: refetchMyResult,
	} = testAPI.useGetMyResultQuery(testId ? { id: testId } : skipToken);

	const [passTest, { isLoading: isSubmitting }] = testAPI.usePassMutation();

	const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
	const [remainingSeconds, setRemainingSeconds] = useState(0);
	const [isAttemptActive, setIsAttemptActive] = useState(false);
	const [sessionResult, setSessionResult] = useState<TestResult | null>(null);

	const submitInFlightRef = useRef(false);
	const startedAtRef = useRef<number>(Date.now());

	const questionIds = useMemo(
		() =>
			(test?.questions ?? [])
				.map((question) => question.id)
				.filter((id): id is number => typeof id === 'number'),
		[test?.questions],
	);

	const startNewAttempt = () => {
		if (!test) return;
		setAnswers(toAnswerStateMap(questionIds));
		setRemainingSeconds(test.timeLimitMinutes * 60);
		setIsAttemptActive(true);
		setSessionResult(null);
		submitInFlightRef.current = false;
		startedAtRef.current = Date.now();
	};

	useEffect(() => {
		if (!test) return;
		startNewAttempt();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [test?.id]);

	useEffect(() => {
		if (!isAttemptActive || remainingSeconds <= 0) return;

		const interval = setInterval(() => {
			setRemainingSeconds((prev) => Math.max(0, prev - 1));
		}, 1000);

		return () => clearInterval(interval);
	}, [isAttemptActive, remainingSeconds]);

	const submitAttempt = async (isAutoByTime = false) => {
		if (!testId || !test || submitInFlightRef.current) return;

		submitInFlightRef.current = true;
		setIsAttemptActive(false);

		try {
			const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
			const payloadAnswers = (test.questions ?? [])
				.filter((question) => typeof question.id === 'number')
				.map((question) => {
					const questionId = question.id as number;
					return {
						questionId,
						selectedOptionIds: answers[questionId]?.selectedOptionIds ?? [],
						textAnswer: answers[questionId]?.textAnswer?.trim() || undefined,
						usedHint: answers[questionId]?.usedHint ?? false,
					};
				});

			const result = await passTest({
				id: testId,
				answers: payloadAnswers,
				durationSeconds,
			}).unwrap();

			setSessionResult(result);
			await refetchMyResult();

			if (isAutoByTime) {
				alert('Время вышло. Тест автоматически завершен.');
			}
		} catch (error: any) {
			const message = error?.data?.message ?? 'Не удалось завершить тест';
			alert(Array.isArray(message) ? message.join('\n') : message);
		} finally {
			submitInFlightRef.current = false;
		}
	};

	useEffect(() => {
		if (!isAttemptActive || remainingSeconds !== 0) return;
		void submitAttempt(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [remainingSeconds, isAttemptActive]);

	const setTextAnswer = (questionId: number, value: string) => {
		setAnswers((prev) => ({
			...prev,
			[questionId]: {
				selectedOptionIds: prev[questionId]?.selectedOptionIds ?? [],
				textAnswer: value,
				usedHint: prev[questionId]?.usedHint ?? false,
			},
		}));
	};

	const revealHint = (questionId: number) => {
		setAnswers((prev) => {
			const current = prev[questionId] ?? { selectedOptionIds: [], textAnswer: '', usedHint: false };
			return {
				...prev,
				[questionId]: {
					...current,
					usedHint: true,
				},
			};
		});
	};

	const toggleOption = (questionId: number, optionId: number, mode: 'single' | 'multiple') => {
		setAnswers((prev) => {
			const current = prev[questionId] ?? { selectedOptionIds: [], textAnswer: '', usedHint: false };

			if (mode === 'single') {
				return {
					...prev,
					[questionId]: {
						...current,
						selectedOptionIds: [optionId],
					},
				};
			}

			const selected = new Set(current.selectedOptionIds);
			if (selected.has(optionId)) {
				selected.delete(optionId);
			} else {
				selected.add(optionId);
			}

			return {
				...prev,
				[questionId]: {
					...current,
					selectedOptionIds: Array.from(selected),
				},
			};
		});
	};

	const effectiveResult = sessionResult ?? myResult ?? null;

	if (!testId) {
		return <div className={styles.wrapper}>Некорректный идентификатор теста.</div>;
	}

	if (isLoadingTest) {
		return <div className={styles.wrapper}>Загрузка теста...</div>;
	}

	if (!test) {
		return <div className={styles.wrapper}>Тест не найден.</div>;
	}

	return (
		<div className={styles.wrapper}>
			<div className={styles.headerCard}>
				<div>
					<h1 className={styles.title}>Прохождение теста</h1>
					<p className={styles.subtitle}>{test.name}</p>
				</div>
				<div className={styles.headerActions}>
					<button className={styles.secondaryButton} onClick={() => navigate(routes.TEST)}>К списку тестов</button>
					<button className={styles.primaryButton} onClick={startNewAttempt}>Пройти еще раз</button>
				</div>
			</div>

			<div className={styles.metaGrid}>
				<div className={styles.metaCard}>
					<span>Лимит времени</span>
					<b>{test.timeLimitMinutes} минут</b>
				</div>
				<div className={styles.metaCard}>
					<span>Осталось</span>
					<b className={remainingSeconds <= 60 ? styles.timerDanger : ''}>{formatTimer(remainingSeconds)}</b>
				</div>
				<div className={styles.metaCard}>
					<span>Вопросов</span>
					<b>{test.questions?.length ?? 0}</b>
				</div>
				<div className={styles.metaCard}>
					<span>Статус</span>
					<b>{isAttemptActive ? 'В процессе' : 'Неактивен'}</b>
				</div>
			</div>

			<div className={styles.questionsCard}>
				<div className={styles.questionsHeader}>
					<h2>Вопросы</h2>
					<button
						className={styles.submitButton}
						onClick={() => submitAttempt(false)}
						disabled={!isAttemptActive || isSubmitting}
					>
						{isSubmitting ? 'Завершение...' : 'Завершить тест'}
					</button>
				</div>

				<div className={styles.questionList}>
					{test.questions.map((question, index) => {
						if (typeof question.id !== 'number') {
							return null;
						}
						const questionId = question.id;
						const current = answers[questionId] ?? { selectedOptionIds: [], textAnswer: '', usedHint: false };
						const type = question.type;
						const isSingle = type === 'single_choice';

						return (
							<div key={question.id} className={styles.questionCard}>
								<div className={styles.questionHeader}>
									<strong>Вопрос #{index + 1}</strong>
									<span>{question.isRequired ? 'Обязательный' : 'Необязательный'}</span>
								</div>

								<div className={styles.markdownBlock}>
									<ReactMarkdown remarkPlugins={[remarkGfm]}>{question.title}</ReactMarkdown>
								</div>

								{question.description && (
									<div className={styles.hintArea}>
										{current.usedHint ? (
											<div className={styles.markdownHint}>
												<ReactMarkdown remarkPlugins={[remarkGfm]}>{question.description}</ReactMarkdown>
											</div>
										) : (
											<button
												type="button"
												className={styles.hintButton}
												onClick={() => revealHint(questionId)}
												disabled={!isAttemptActive}
											>
												Показать подсказку
											</button>
										)}
									</div>
								)}

								{type === 'text' ? (
								<textarea
									value={current.textAnswer}
									onChange={(event) => setTextAnswer(questionId, event.target.value)}
									placeholder={question.textAnswerPlaceholder ?? 'Введите ваш ответ'}
									disabled={!isAttemptActive}
								/>
							) : (
								<div className={styles.optionList}>
									{question.options.map((option, optionIndex) => {
										if (typeof option.id !== 'number') {
											return null;
										}
										const optionId = option.id;
										const selected = current.selectedOptionIds.includes(optionId);
										return (
											<button
												key={`${questionId}-${optionIndex}`}
												type="button"
												onClick={() => toggleOption(questionId, optionId, isSingle ? 'single' : 'multiple')}
												className={`${styles.optionItem} ${selected ? styles.optionItemSelected : ''}`}
												disabled={!isAttemptActive}
											>
													<span className={`${styles.optionControl} ${isSingle ? styles.optionControlRadio : ''}`}>
														{selected ? '✓' : ''}
													</span>
													<span>{option.text}</span>
												</button>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			<div className={styles.resultCard}>
				<h2>Последний сохраненный результат</h2>
				{isLoadingResult ? (
					<div>Загрузка результата...</div>
				) : effectiveResult ? (
					<>
						<div className={styles.resultGrid}>
							<div><span>Баллы</span><b>{effectiveResult.score}</b></div>
							<div><span>Верно</span><b>{effectiveResult.correctAnswers} / {effectiveResult.evaluatedQuestions}</b></div>
						<div><span>Процент</span><b>{effectiveResult.percentage}%</b></div>
						<div><span>Длительность</span><b>{effectiveResult.durationSeconds ?? '-'} сек</b></div>
						<div><span>Подсказки</span><b>{effectiveResult.hintsUsed ?? 0} / {effectiveResult.hintsTotal ?? 0}</b></div>
						<div><span>Обновлено</span><b>{formatDate(effectiveResult.updatedAt ?? effectiveResult.submittedAt)}</b></div>
					</div>

						<div className={styles.resultDetails}>
							<h3>Разбор по вопросам</h3>
							<div className={styles.resultQuestionList}>
								{test.questions.map((question, index) => {
									if (typeof question.id !== 'number') return null;
									const resultAnswer = effectiveResult.answers.find((answer) => answer.questionId === question.id);
									const selectedIds = resultAnswer?.selectedOptionIds ?? [];
									const selectedTexts = question.options
										.filter((option) => typeof option.id === 'number' && selectedIds.includes(option.id))
										.map((option) => option.text);
									const correctTexts = question.options
										.filter((option) => option.isCorrect)
										.map((option) => option.text);

									let statusLabel = 'Не проверяется';
									let statusClassName = styles.statusNeutral;
									if (resultAnswer?.isCorrect === true) {
										statusLabel = 'Верно';
										statusClassName = styles.statusCorrect;
									} else if (resultAnswer?.isCorrect === false) {
										statusLabel = 'Неверно';
										statusClassName = styles.statusWrong;
									}

									return (
										<div key={`result-q-${question.id}`} className={styles.resultQuestionCard}>
											<div className={styles.resultQuestionHeader}>
												<strong>Вопрос #{index + 1}</strong>
												<span className={statusClassName}>{statusLabel}</span>
											</div>
											<div className={styles.resultQuestionBody}>
												<div className={styles.resultText}>
													<ReactMarkdown remarkPlugins={[remarkGfm]}>{question.title}</ReactMarkdown>
												</div>
												<div><b>Подсказка использована:</b> {question.description?.trim() ? (resultAnswer?.usedHint ? 'Да' : 'Нет') : 'Нет подсказки'}</div>
												<div><b>Ваш ответ:</b> {question.type === 'text' ? (resultAnswer?.textAnswer || '—') : (selectedTexts.length > 0 ? selectedTexts.join(', ') : '—')}</div>
												<div><b>Верный ответ:</b> {question.type === 'text' ? (question.expectedTextAnswer?.trim() || 'Не задан') : (correctTexts.length > 0 ? correctTexts.join(', ') : 'Не задан')}</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</>
				) : (
					<div>Результатов пока нет.</div>
				)}
			</div>
		</div>
	);
};
