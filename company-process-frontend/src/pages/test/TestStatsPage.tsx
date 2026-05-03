import { testAPI } from '@entities/test/api/api';
import { skipToken } from '@reduxjs/toolkit/query';
import routes from '@shared/config/routes';
import { Modal } from '@shared/ui/modal/ui/Modal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import styles from './TestStatsPage.module.scss';

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

const formatSeconds = (value?: number | null) => {
	if (value === null || value === undefined) return '-';
	const m = Math.floor(value / 60).toString().padStart(2, '0');
	const s = (value % 60).toString().padStart(2, '0');
	return `${m}:${s}`;
};

export const TestStatsPage = () => {
	const navigate = useNavigate();
	const params = useParams<{ testId?: string }>();
	const testId = params.testId ? Number(params.testId) : undefined;
	const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
	const [isAnswersModalOpen, setIsAnswersModalOpen] = useState(false);

	const { data, isLoading } = testAPI.useGetStatsQuery(testId ? { id: testId } : skipToken);
	const { data: fullTest } = testAPI.useGetByIdQuery(testId ? { id: testId } : skipToken);

	const sortedAssignments = useMemo(() => {
		return [...(data?.assignment.assignedEmployees ?? [])]
			.sort((a, b) => Number(a.hasPassed) - Number(b.hasPassed))
			.reverse();
	}, [data?.assignment.assignedEmployees]);
	const selectedResult = useMemo(
		() => data?.results.find((result) => result.id === selectedResultId) ?? null,
		[data?.results, selectedResultId],
	);
	const openAnswersModal = (resultId: number) => {
		setSelectedResultId(resultId);
		setIsAnswersModalOpen(true);
	};
	const closeAnswersModal = (active: boolean) => {
		setIsAnswersModalOpen(active);
		if (!active) {
			setSelectedResultId(null);
		}
	};

	if (!testId) {
		return <div className={styles.wrapper}>Некорректный идентификатор теста.</div>;
	}

	if (isLoading) {
		return <div className={styles.wrapper}>Загрузка статистики...</div>;
	}

	if (!data) {
		return <div className={styles.wrapper}>Статистика не найдена.</div>;
	}

	return (
		<div className={styles.wrapper}>
			<div className={styles.hero}>
				<div>
					<h1 className={styles.title}>Статистика теста</h1>
					<p className={styles.subtitle}>{data.test.name}</p>
				</div>
				<div className={styles.heroActions}>
					<button className={styles.secondaryButton} onClick={() => navigate(routes.TEST)}>К списку тестов</button>
					<button className={styles.secondaryButton} onClick={() => navigate(`/tests/${data.test.id}/edit`)}>Редактировать тест</button>
				</div>
			</div>

			<div className={styles.metricsGrid}>
				<div className={styles.metricCard}><span>Назначено сотрудникам</span><b>{data.assignment.assignedEmployeesCount}</b></div>
				<div className={styles.metricCard}><span>Прошли тест</span><b>{data.assignment.passedEmployeesCount}</b></div>
				<div className={styles.metricCard}><span>Не прошли</span><b>{data.assignment.notPassedEmployeesCount}</b></div>
				<div className={styles.metricCard}><span>Средний результат</span><b>{data.summary.averagePercentage}%</b></div>
				<div className={styles.metricCard}><span>Минимум/максимум</span><b>{data.summary.minPercentage}% / {data.summary.maxPercentage}%</b></div>
				<div className={styles.metricCard}><span>Всего вопросов</span><b>{data.test.questionStats.total}</b></div>
			</div>

			<div className={styles.card}>
				<h3>Назначения теста</h3>
				<div className={styles.linksRow}>
					<div><b>Прямо сотрудникам:</b> {data.test.links.employees.length}</div>
					<div><b>По должностям:</b> {data.test.links.positions.length}</div>
					<div><b>По процессам:</b> {data.test.links.processes.length}</div>
					<div><b>По задачам:</b> {data.test.links.tasks.length}</div>
				</div>

				<div className={styles.chipsBlock}>
					{data.test.links.positions.map((position) => (
						<span key={`pos-${position.id}`} className={styles.chip}>Должность: {position.name}</span>
					))}
					{data.test.links.processes.map((process) => (
						<span key={`proc-${process.id}`} className={styles.chip}>Процесс: {process.name}</span>
					))}
					{data.test.links.tasks.map((task) => (
						<span key={`task-${task.id}`} className={styles.chip}>Задача: {task.name}</span>
					))}
				</div>
			</div>

			<div className={styles.card}>
				<h3>Сотрудники, которым назначен тест</h3>
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Сотрудник</th>
								<th>Должность</th>
								<th>Причина назначения</th>
								<th>Статус</th>
								<th>Результат</th>
								<th>Время</th>
								<th>Обновлено</th>
							</tr>
						</thead>
						<tbody>
							{sortedAssignments.map((row) => (
								<tr key={`employee-${row.employee.id}`}>
									<td>
										<div className={styles.itemTitle}>{row.employee.fullName}</div>
										<div className={styles.itemSub}>{row.employee.email}</div>
										<div className={styles.itemSub}>Логин: {row.employee.account?.login ?? '—'}</div>
									</td>
									<td>{row.employee.position?.name ?? '—'}</td>
									<td>
										<div className={styles.reasonList}>
											{row.assignmentReasons.byDirectLink && <span>Прямое назначение</span>}
											{row.assignmentReasons.byPositionLink && <span>По должности</span>}
											{row.assignmentReasons.byProcesses.map((item) => <span key={`pr-${row.employee.id}-${item.id}`}>Процесс: {item.name}</span>)}
											{row.assignmentReasons.byTasks.map((item) => <span key={`ta-${row.employee.id}-${item.id}`}>Задача: {item.name}</span>)}
										</div>
									</td>
									<td>
										<span className={row.hasPassed ? styles.statusDone : styles.statusPending}>
											{row.hasPassed ? 'Пройден' : 'Не пройден'}
										</span>
									</td>
									<td>{row.result ? `${row.result.percentage}% (${row.result.correctAnswers}/${row.result.evaluatedQuestions})` : '—'}</td>
									<td>{row.result ? formatSeconds(row.result.durationSeconds) : '—'}</td>
									<td>{row.result ? formatDate(row.result.updatedAt) : '—'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className={styles.card}>
				<h3>Все результаты прохождений</h3>
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Пользователь</th>
								<th>Тип</th>
								<th>Результат</th>
								<th>Подсказки</th>
								<th>Время</th>
								<th>Дата</th>
								<th>Ответы</th>
							</tr>
						</thead>
						<tbody>
							{data.results.map((result) => (
								<tr key={`result-${result.id}`}>
									<td>
										<div className={styles.itemTitle}>{result.user.employeeProfile?.fullName ?? result.user.login}</div>
										<div className={styles.itemSub}>{result.user.email}</div>
									</td>
									<td>{result.user.actorType === 'EMPLOYEE' ? 'Сотрудник' : 'Админ'}</td>
									<td>{result.percentage}% ({result.correctAnswers}/{result.evaluatedQuestions})</td>
									<td>{result.hintsUsed}/{result.hintsTotal}</td>
									<td>{formatSeconds(result.durationSeconds)}</td>
									<td>{formatDate(result.updatedAt)}</td>
									<td>
										<button
											type="button"
											className={styles.viewAnswersButton}
											onClick={() => openAnswersModal(result.id)}
										>
											Посмотреть
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<Modal
				isActive={isAnswersModalOpen}
				onClose={closeAnswersModal}
				contentClassName={styles.answersModal}
			>
				{selectedResult ? (
					<div className={styles.answersModalContent}>
						<div className={styles.answersModalHeader}>
							<h3 className={styles.answersModalTitle}>Ответы сотрудника</h3>
							<div className={styles.answersModalSubtitle}>
								{selectedResult.user.employeeProfile?.fullName ?? selectedResult.user.login}
							</div>
						</div>

						<div className={styles.answersMeta}>
							<span className={styles.answersMetaChip}>
								Результат: {selectedResult.percentage}% ({selectedResult.correctAnswers}/{selectedResult.evaluatedQuestions})
							</span>
							<span className={styles.answersMetaChip}>
								Подсказки: {selectedResult.hintsUsed}/{selectedResult.hintsTotal}
							</span>
							<span className={styles.answersMetaChip}>
								Время: {formatSeconds(selectedResult.durationSeconds)}
							</span>
							<span className={styles.answersMetaChip}>
								Дата: {formatDate(selectedResult.updatedAt)}
							</span>
						</div>

						<div className={styles.answerDetails}>
							{selectedResult.answers.map((answer) => {
								const question = fullTest?.questions?.find((item) => item.id === answer.questionId);
								const selectedTexts = question?.options
									?.filter((option) => typeof option.id === 'number' && answer.selectedOptionIds.includes(option.id))
									.map((option) => option.text) ?? [];
								const correctTexts = question?.options
									?.filter((option) => option.isCorrect)
									.map((option) => option.text) ?? [];

								let statusLabel = 'Не проверяется';
								let statusClassName = styles.statusNeutral;
								if (answer.isCorrect === true) {
									statusLabel = 'Верно';
									statusClassName = styles.statusCorrect;
								} else if (answer.isCorrect === false) {
									statusLabel = 'Неверно';
									statusClassName = styles.statusWrong;
								}

								return (
									<div key={`modal-ans-${selectedResult.id}-${answer.questionId}`} className={styles.answerRow}>
										<div className={styles.answerRowHeader}>
											<strong>Вопрос #{answer.questionOrder}</strong>
											<span className={statusClassName}>{statusLabel}</span>
										</div>

										<div className={styles.answerTitleMarkdown}>
											<ReactMarkdown remarkPlugins={[remarkGfm]}>
												{question?.title ?? answer.questionTitle}
											</ReactMarkdown>
										</div>

										<div className={styles.answerInfoRow}>
											<b>Подсказка использована:</b>{' '}
											{question?.description?.trim()
												? (answer.usedHint ? 'Да' : 'Нет')
												: 'Нет подсказки'}
										</div>
										<div className={styles.answerInfoRow}>
											<b>Ваш ответ:</b>{' '}
											{answer.questionType === 'text'
												? (answer.textAnswer || '—')
												: (selectedTexts.length > 0 ? selectedTexts.join(', ') : '—')}
										</div>
										<div className={styles.answerInfoRow}>
											<b>Верный ответ:</b>{' '}
											{answer.questionType === 'text'
												? (question?.expectedTextAnswer?.trim() || 'Не задан')
												: (correctTexts.length > 0 ? correctTexts.join(', ') : 'Не задан')}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				) : (
					<div>Ответы не найдены.</div>
				)}
			</Modal>
		</div>
	);
};
