import { processAPI } from '@entities/process/api/api';
import { skipToken } from '@reduxjs/toolkit/query';
import routes from '@shared/config/routes';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate, useParams } from 'react-router-dom';

import styles from './ProcessDocumentationPage.module.scss';

const formatDate = (value?: string | Date) => {
	if (!value) return '-';
	const parsed = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(parsed.getTime())) return '-';
	return parsed.toLocaleString('ru-RU');
};

const toReadableMarkdown = (text?: string) => {
	if (!text?.trim()) return 'Описание недоступно';

	const lines = text.split('\n');
	const result: string[] = [];
	let inDescriptionSection = false;

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (!line) {
			result.push('');
			continue;
		}

		if (line.startsWith('Процесс:')) {
			inDescriptionSection = false;
			const value = line.replace('Процесс:', '').trim();
			result.push('## Процесс');
			result.push(`**${value}**`);
			continue;
		}

		if (line.startsWith('Цель:')) {
			inDescriptionSection = false;
			const value = line.replace('Цель:', '').trim();
			result.push('## Цель');
			result.push(value || '-');
			continue;
		}

		if (line === 'Участники:') {
			inDescriptionSection = false;
			result.push('## Участники');
			continue;
		}

		if (line === 'Описание:') {
			inDescriptionSection = true;
			result.push('## Описание');
			continue;
		}

		if (line.startsWith('- Должность:')) {
			const value = line.replace('- Должность:', '').trim();
			result.push(`- **Должность:** ${value}`);
			continue;
		}

		if (line.startsWith('- Роль:')) {
			const value = line.replace('- Роль:', '').trim();
			result.push(`- **Роль:** ${value}`);
			continue;
		}

		if (inDescriptionSection) {
			const stepMatch = line.match(/^(\d+)\.\s*(.+?)(?:\s*\((.+?)\))?(?:,\s*(.+))?$/);
			if (stepMatch) {
				const [, stepNumber, stepTitleRaw, metaRaw, noteRaw] = stepMatch;
				const stepTitle = stepTitleRaw.trim();
				const metaParts = (metaRaw ?? '')
					.split(';')
					.map((part) => part.trim())
					.filter(Boolean);

				result.push(`${stepNumber}. **${stepTitle}**`);

				for (const part of metaParts) {
					if (part.startsWith('должность:')) {
						result.push(`   - **Должность:** ${part.replace('должность:', '').trim()}`);
						continue;
					}
					if (part.startsWith('роль:')) {
						result.push(`   - **Роль:** ${part.replace('роль:', '').trim()}`);
						continue;
					}
					result.push(`   - **Тип:** ${part}`);
				}

				if (noteRaw?.trim()) {
					result.push(`   - **Примечание:** ${noteRaw.trim()}`);
				}

				continue;
			}
		}

		result.push(line);
	}

	return result.join('\n').trim();
};

export const ProcessDocumentationPage = () => {
	const navigate = useNavigate();
	const { processId: processIdParam } = useParams<{ processId: string }>();

	const processId = Number(processIdParam);
	const isValidProcessId = Number.isInteger(processId) && processId > 0;

	const [generatePdf, { isLoading: isGeneratingPdf }] = processAPI.useGeneratePdfMutation();

	const { data: processData, isFetching: isProcessFetching } = processAPI.useGetByIdQuery(
		isValidProcessId ? { id: processId } : skipToken,
	);
	const { data: descriptionData, isFetching: isDescriptionFetching } = processAPI.useGetDescriptionQuery(
		isValidProcessId ? { id: processId } : skipToken,
	);
	const { data: passportData, isFetching: isPassportFetching } = processAPI.useGetPassportQuery(
		isValidProcessId ? { id: processId } : skipToken,
	);
	const { data: validateData, isFetching: isValidateFetching } = processAPI.useValidateQuery(
		isValidProcessId ? { id: processId } : skipToken,
	);
	const isLoading = isProcessFetching || isDescriptionFetching || isPassportFetching || isValidateFetching;

	const hasValidationIssues = Boolean(validateData && !validateData.isValid);

	const validationIssues = useMemo(() => {
		if (!validateData) return [];

		const issues: string[] = [];
		if (!validateData.checks.hasStart) issues.push('Нет задачи типа start');
		if (!validateData.checks.hasEnd) issues.push('Нет задачи типа end');
		if (!validateData.checks.allTasksConnected) issues.push('Не все задачи связаны');
		if (!validateData.checks.noHangingTasks) issues.push('Есть висящие задачи');
		if (!validateData.checks.noCyclesWithoutExit) issues.push('Есть циклы без выхода');
		if (!validateData.checks.allTasksHaveResponsiblePosition) {
			issues.push('Есть задачи без ответственной должности');
		}

		return issues;
	}, [validateData]);

	const onBack = () => navigate(routes.HOME);

	const onOpenEditor = () => {
		if (!isValidProcessId) return;
		navigate(routes.EDITOR.replace(':processId', String(processId)));
	};

	const onDownloadPdf = async () => {
		if (!isValidProcessId || !processData) return;

		const blob = await generatePdf({
			id: processId,
			companyName: 'ООО "СтартСет"',
		}).unwrap();

		const safeName = processData.name
			.trim()
			.replace(/[\\/:*?"<>|]+/g, '_')
			.replace(/\s+/g, '_');
		const objectUrl = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = objectUrl;
		link.download = `${safeName || `process_${processId}`}.pdf`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(objectUrl);
	};

	if (!isValidProcessId) {
		return (
			<div className={styles.wrapper}>
				<div className={styles.errorCard}>
					Некорректный ID процесса в URL.
				</div>
			</div>
		);
	}

	return (
		<div className={styles.wrapper}>
			<div className={styles.header}>
				<div>
					<h1>Документация процесса</h1>
					<div className={styles.subTitle}>
						Предпросмотр описания и паспорта перед выгрузкой PDF
					</div>
				</div>

				<div className={styles.actions}>
					<button className={styles.secondaryButton} onClick={onBack}>Назад к дереву</button>
					<button className={styles.secondaryButton} onClick={onOpenEditor}>Открыть схему</button>
					<button
						className={styles.primaryButton}
						onClick={onDownloadPdf}
						disabled={!processData || isGeneratingPdf}
					>
						{isGeneratingPdf ? 'Формирование PDF...' : 'Скачать PDF'}
					</button>
				</div>
			</div>

			{isLoading && (
				<div className={styles.card}>Загрузка документации...</div>
			)}

			{!isLoading && processData && (
				<>
					<div className={styles.grid}>
						<div className={styles.card}>
							<div className={styles.sectionTitle}>Процесс</div>
							<div><strong>Название:</strong> {processData.name}</div>
							<div><strong>Описание:</strong> {processData.description ?? '-'}</div>
							<div><strong>Цель:</strong> {processData.goal ?? '-'}</div>
							<div><strong>Версия:</strong> {processData.version ?? '-'}</div>
							<div><strong>Статус:</strong> {processData.isActive ? 'Активный' : 'Неактивный'}</div>
							<div><strong>Создан:</strong> {formatDate(processData.createdAt)}</div>
							<div><strong>Обновлен:</strong> {formatDate(processData.updatedAt)}</div>
						</div>

						<div className={styles.card}>
							<div className={styles.sectionTitle}>Валидация схемы</div>
							<div>
								<strong>Статус:</strong>{' '}
								<span className={hasValidationIssues ? styles.bad : styles.good}>
									{validateData?.isValid ? 'Схема валидна' : 'Есть ошибки'}
								</span>
							</div>
							<div><strong>Задач:</strong> {validateData?.stats.tasksCount ?? '-'}</div>
							<div><strong>Стрелок:</strong> {validateData?.stats.arrowsCount ?? '-'}</div>
							{validationIssues.length > 0 && (
								<div className={styles.issueBlock}>
									{validationIssues.map((issue) => (
										<div key={issue}>• {issue}</div>
									))}
								</div>
							)}
						</div>
					</div>

					<div className={styles.card}>
						<div className={styles.sectionTitle}>Текстовое описание процесса</div>
						<div className={styles.descriptionCard}>
							<div className={styles.markdown}>
								<ReactMarkdown remarkPlugins={[remarkGfm]}>
									{toReadableMarkdown(descriptionData?.text)}
								</ReactMarkdown>
							</div>
						</div>
					</div>

					<div className={styles.grid}>
						<div className={styles.card}>
							<div className={styles.sectionTitle}>Паспорт: участники</div>
							<div className={styles.list}>
								{passportData?.participants && passportData.participants.length > 0 ? (
									passportData.participants.map((participant, index) => (
										<div key={`${participant.name}-${index}`} className={styles.listItem}>
											<div className={styles.itemTitle}>{participant.name}</div>
											<div className={styles.itemSub}>
												Сотрудники: {participant.employees && participant.employees.length > 0
													? participant.employees.map((employee) => employee.fullName).join(', ')
													: 'не назначены'}
											</div>
										</div>
									))
								) : (
									<div className={styles.empty}>Нет данных</div>
								)}
							</div>
						</div>

						<div className={styles.card}>
							<div className={styles.sectionTitle}>Паспорт: входы/выходы</div>
							<div className={styles.flowSection}>
								<div className={styles.flowTitle}>Входные данные</div>
								{passportData?.inputs && passportData.inputs.length > 0 ? (
									passportData.inputs.map((input) => (
										<div key={`in-${input.dataObjectId}`} className={styles.chip}>{input.name}</div>
									))
								) : (
									<div className={styles.empty}>Нет данных</div>
								)}
							</div>

							<div className={styles.flowSection}>
								<div className={styles.flowTitle}>Выходные данные</div>
								{passportData?.outputs && passportData.outputs.length > 0 ? (
									passportData.outputs.map((output) => (
										<div key={`out-${output.dataObjectId}`} className={styles.chip}>{output.name}</div>
									))
								) : (
									<div className={styles.empty}>Нет данных</div>
								)}
							</div>
						</div>
					</div>

					<div className={styles.card}>
						<div className={styles.sectionTitle}>Паспорт: задачи</div>
						<div className={styles.tableContainer}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>ID</th>
										<th>Название</th>
										<th>Тип</th>
										<th>Ответственный</th>
									</tr>
								</thead>
								<tbody>
									{passportData?.tasks && passportData.tasks.length > 0 ? (
										passportData.tasks.map((task) => (
											<tr key={task.id}>
												<td>{task.id}</td>
												<td>{task.name}</td>
												<td>{task.type}</td>
												<td>{task.responsible || '-'}</td>
											</tr>
										))
									) : (
										<tr>
											<td colSpan={4} className={styles.emptyRow}>Нет задач</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>
	);
};
