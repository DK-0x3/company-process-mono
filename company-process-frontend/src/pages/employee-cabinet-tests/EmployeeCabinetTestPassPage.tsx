import { cabinetAPI } from '@entities/cabinet/api/api';
import { skipToken } from '@reduxjs/toolkit/query';
import routes from '@shared/config/routes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import styles from './EmployeeCabinetTestPassPage.module.scss';

interface AnswerState {
	selectedOptionIds: number[];
	textAnswer: string;
	usedHint: boolean;
}

const formatTimer = (seconds: number) => {
	const safe = Math.max(0, seconds);
	const m = Math.floor(safe / 60).toString().padStart(2, '0');
	const s = (safe % 60).toString().padStart(2, '0');
	return `${m}:${s}`;
};

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

export const EmployeeCabinetTestPassPage = () => {
	const navigate = useNavigate();
	const params = useParams<{ testId?: string }>();
	const testId = params.testId ? Number(params.testId) : undefined;

	const { data: test, isLoading: isLoadingTest } = cabinetAPI.useGetTestByIdQuery(
		testId ? testId : skipToken,
	);
	const {
		data: result,
		isLoading: isLoadingResult,
		refetch: refetchResult,
	} = cabinetAPI.useGetTestResultQuery(testId ? testId : skipToken);
	const [passTest, { isLoading: isSubmitting }] = cabinetAPI.usePassTestMutation();

	const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
	const [remainingSeconds, setRemainingSeconds] = useState(0);
	const [isAttemptActive, setIsAttemptActive] = useState(false);

	const submitInFlightRef = useRef(false);
	const startedAtRef = useRef<number>(Date.now());

	const questionIds = useMemo(
		() =>
			(test?.questions ?? [])
				.map((question) => question.id)
				.filter((id): id is number => typeof id === 'number'),
		[test?.questions],
	);

	useEffect(() => {
		if (!test) return;

		const initialAnswers: Record<number, AnswerState> = {};
		questionIds.forEach((id) => {
			initialAnswers[id] = {
				selectedOptionIds: [],
				textAnswer: '',
				usedHint: false,
			};
		});
		setAnswers(initialAnswers);
		setRemainingSeconds(test.timeLimitMinutes * 60);
		startedAtRef.current = Date.now();
	}, [test, questionIds]);

	useEffect(() => {
		if (!test) return;
		setIsAttemptActive(!result);
	}, [result, test]);

	useEffect(() => {
		if (!isAttemptActive || remainingSeconds <= 0) return;

		const interval = setInterval(() => {
			setRemainingSeconds((prev) => Math.max(0, prev - 1));
		}, 1000);

		return () => clearInterval(interval);
	}, [isAttemptActive, remainingSeconds]);

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
		setAnswers((prev) => ({
			...prev,
			[questionId]: {
				selectedOptionIds: prev[questionId]?.selectedOptionIds ?? [],
				textAnswer: prev[questionId]?.textAnswer ?? '',
				usedHint: true,
			},
		}));
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
			if (selected.has(optionId)) selected.delete(optionId);
			else selected.add(optionId);

			return {
				...prev,
				[questionId]: {
					...current,
					selectedOptionIds: Array.from(selected),
				},
			};
		});
	};

	const submitAttempt = async (isAutoByTime = false) => {
		if (!testId || !test || submitInFlightRef.current || !isAttemptActive) return;

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

			await passTest({
				testId,
				answers: payloadAnswers,
				durationSeconds,
			}).unwrap();

			await refetchResult();
			if (isAutoByTime) {
				alert('Время вышло. Тест автоматически завершен.');
			}
		} catch (error: any) {
			const message = error?.data?.message ?? 'Не удалось завершить тест';
			alert(Array.isArray(message) ? message.join('\n') : message);
			setIsAttemptActive(false);
		} finally {
			submitInFlightRef.current = false;
		}
	};

	useEffect(() => {
		if (!isAttemptActive || remainingSeconds !== 0) return;
		void submitAttempt(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [remainingSeconds, isAttemptActive]);

	if (!testId) {
		return <div className={styles.wrapper}>Некорректный идентификатор теста.</div>;
	}

	if (isLoadingTest || isLoadingResult) {
		return <div className={styles.wrapper}>Загрузка теста...</div>;
	}

	if (!test) {
		return <div className={styles.wrapper}>Тест не найден.</div>;
	}

	return (
		<div className={styles.wrapper}>
			<div className={styles.headerCard}>
				<div>
					<h1 className={styles.title}>{test.name}</h1>
					<p className={styles.subtitle}>Тест можно пройти только один раз.</p>
				</div>
				<div className={styles.headerActions}>
					<button className={styles.secondaryButton} onClick={() => navigate(routes.CABINET_TESTS)}>К списку тестов</button>
					<button
						className={styles.submitButton}
						onClick={() => submitAttempt(false)}
						disabled={!isAttemptActive || isSubmitting}
					>
						{isSubmitting ? 'Отправка...' : 'Завершить тест'}
					</button>
				</div>
			</div>

			<div className={styles.metaGrid}>
				<div className={styles.metaCard}><span>Время на тест</span><b>{test.timeLimitMinutes} мин</b></div>
				<div className={styles.metaCard}><span>Осталось</span><b>{formatTimer(remainingSeconds)}</b></div>
				<div className={styles.metaCard}><span>Вопросов</span><b>{test.questions.length}</b></div>
				<div className={styles.metaCard}><span>Статус</span><b>{result ? 'Пройден' : 'Не пройден'}</b></div>
			</div>

			<div className={styles.questionsCard}>
				{test.questions.map((question, index) => {
					if (typeof question.id !== 'number') return null;
					const questionId = question.id;
					const current = answers[questionId] ?? { selectedOptionIds: [], textAnswer: '', usedHint: false };
					const isSingle = question.type === 'single_choice';

					return (
						<div key={questionId} className={styles.questionCard}>
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

							{question.type === 'text' ? (
								<textarea
									value={current.textAnswer}
									onChange={(event) => setTextAnswer(questionId, event.target.value)}
									placeholder={question.textAnswerPlaceholder ?? 'Введите ваш ответ'}
									disabled={!isAttemptActive}
								/>
							) : (
								<div className={styles.optionList}>
									{question.options.map((option, optionIndex) => {
										if (typeof option.id !== 'number') return null;
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
												<span className={`${styles.optionControl} ${isSingle ? styles.optionControlRadio : ''}`}>{selected ? '✓' : ''}</span>
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

			<div className={styles.resultCard}>
				<h2>Результат</h2>
				{result ? (
					<>
						<div className={styles.resultGrid}>
							<div><span>Баллы</span><b>{result.score}</b></div>
							<div><span>Верно</span><b>{result.correctAnswers} / {result.evaluatedQuestions}</b></div>
							<div><span>Процент</span><b>{result.percentage}%</b></div>
							<div><span>Подсказки</span><b>{result.hintsUsed} / {result.hintsTotal}</b></div>
							<div><span>Обновлено</span><b>{formatDate(result.updatedAt)}</b></div>
						</div>

						<div className={styles.resultList}>
							{test.questions.map((question, index) => {
								if (typeof question.id !== 'number') return null;
								const row = result.answers.find((answer) => answer.questionId === question.id);
								const selectedIds = row?.selectedOptionIds ?? [];
								const selectedTexts = question.options
									.filter((option) => typeof option.id === 'number' && selectedIds.includes(option.id))
									.map((option) => option.text);

								return (
									<div key={`result-${question.id}`} className={styles.resultItem}>
										<div className={styles.resultHeader}><strong>Вопрос #{index + 1}</strong><span>{row?.usedHint ? 'Подсказка использована' : 'Без подсказки'}</span></div>
										<div className={styles.resultQuestion}><ReactMarkdown remarkPlugins={[remarkGfm]}>{question.title}</ReactMarkdown></div>
										<div><b>Ваш ответ:</b> {question.type === 'text' ? (row?.textAnswer || '—') : (selectedTexts.length > 0 ? selectedTexts.join(', ') : '—')}</div>
									</div>
								);
							})}
						</div>
					</>
				) : (
					<div className={styles.pending}>Тест еще не пройден.</div>
				)}
			</div>
		</div>
	);
};
