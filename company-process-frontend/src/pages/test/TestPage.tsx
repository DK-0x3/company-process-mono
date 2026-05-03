import { canEditEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import { testAPI } from '@entities/test/api/api';
import { Test } from '@entities/test/model/types/Test';
import routes from '@shared/config/routes';
import { InputWithAddon } from '@shared/ui/input-with-addon/InputWithAddon';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './TestPage.module.scss';

const normalizeText = (value: string) => value.trim().toLowerCase();

const formatDate = (value?: string) => {
	if (!value) return '-';
	return new Date(value).toLocaleString('ru-RU', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
};

export const TestPage = () => {
	const authUser = useAppSelector(selectAuthUser);
	const canEditTests = canEditEntity(authUser, 'tests');
	const isEmployeeActor = authUser?.actorType === 'EMPLOYEE';
	const navigate = useNavigate();
	const [search, setSearch] = useState('');

	const { data: tests } = testAPI.useGetAllQuery();
	const [deleteTest, { isLoading: isDeleting }] = testAPI.useDeleteMutation();

	const summary = useMemo(() => {
		const allTests = tests ?? [];

		return {
			tests: allTests.length,
			questions: allTests.reduce((acc, test) => acc + (test.questions?.length ?? 0), 0),
			employeeLinks: allTests.reduce((acc, test) => acc + (test._count?.employeeLinks ?? test.employeeLinks?.length ?? 0), 0),
			positionLinks: allTests.reduce((acc, test) => acc + (test._count?.positionLinks ?? test.positionLinks?.length ?? 0), 0),
		};
	}, [tests]);

	const filtered = useMemo(() => {
		const searchLower = normalizeText(search);
		return (tests ?? []).filter((test) => {
			if (!searchLower) return true;

			const positionsLine = (test.positionLinks ?? []).map((item) => item.position?.name ?? '').join(' ');
			const processesLine = (test.processLinks ?? []).map((item) => item.process?.name ?? '').join(' ');

			return (
				normalizeText(test.name).includes(searchLower)
				|| normalizeText(test.description ?? '').includes(searchLower)
				|| normalizeText(positionsLine).includes(searchLower)
				|| normalizeText(processesLine).includes(searchLower)
			);
		});
	}, [tests, search]);

	const onDelete = async (test: Test) => {
		const confirmed = window.confirm(`Удалить тест "${test.name}"?`);
		if (!confirmed) return;

		await deleteTest({ id: test.id }).unwrap();
	};

	const onOpenPass = (testId: number) => {
		if (isEmployeeActor) {
			navigate(routes.CABINET_TEST_PASS.replace(':testId', String(testId)));
			return;
		}

		navigate(routes.TEST_PASS.replace(':testId', String(testId)));
	};

	return (
		<div className={styles.wrapper}>
			<div className={styles.hero}>
				<div>
					<h1 className={styles.title}>Тестирование сотрудников</h1>
					<p className={styles.subtitle}>
						Создание тестов, привязка к должностям, сотрудникам, процессам и задачам.
					</p>
				</div>

				<div className={styles.metrics}>
					<div className={styles.metric}><span>Тестов</span><b>{summary.tests}</b></div>
					<div className={styles.metric}><span>Вопросов</span><b>{summary.questions}</b></div>
					<div className={styles.metric}><span>Связей с сотрудниками</span><b>{summary.employeeLinks}</b></div>
					<div className={styles.metric}><span>Связей с должностями</span><b>{summary.positionLinks}</b></div>
				</div>
			</div>

			<div className={styles.toolsRow}>
				<div className={styles.searchCard}>
					<label className={styles.toolsLabel}>Поиск тестов</label>
					<InputWithAddon
						containerClassName={styles.search}
						inputClassName={styles.searchInput}
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						leftAddon={<SmartIcon iconName={'search'} className={styles.searchIcon} />}
					/>
				</div>

				<div className={styles.actionsCard}>
					{canEditTests && (
						<button className={styles.primaryButton} onClick={() => navigate(routes.TEST_CREATE)}>
							Создать тест
						</button>
					)}
				</div>
			</div>

			<div className={styles.tableCard}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Название</th>
							<th>Время</th>
							<th>Вопросов</th>
							<th>Назначений</th>
							<th>Обновлено</th>
							<th>Действия</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((test) => {
							const assignmentCount =
								(test._count?.employeeLinks ?? test.employeeLinks?.length ?? 0)
								+ (test._count?.positionLinks ?? test.positionLinks?.length ?? 0)
								+ (test._count?.processLinks ?? test.processLinks?.length ?? 0)
								+ (test._count?.taskLinks ?? test.taskLinks?.length ?? 0);

							return (
								<tr key={test.id}>
									<td>{test.name}</td>
									<td>{test.timeLimitMinutes} мин</td>
									<td>{test.questions?.length ?? 0}</td>
									<td>{assignmentCount}</td>
									<td>{formatDate(test.updatedAt)}</td>
									<td>
										<div className={styles.actionRow}>
											<button
												onClick={() => onOpenPass(test.id)}
												className={styles.actionPrimary}
											>
												Пройти
											</button>
											{canEditTests && (
												<>
													<button
														onClick={() => navigate(`/tests/${test.id}/stats`)}
														className={styles.actionInfo}
													>
														Статистика
													</button>
													<button
														onClick={() => navigate(`/tests/${test.id}/edit`)}
														className={styles.actionSecondary}
													>
														Ред.
													</button>
													<button
														onClick={() => onDelete(test)}
														disabled={isDeleting}
														className={styles.actionDanger}
													>
														Удалить
													</button>
												</>
											)}
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>

				{filtered.length === 0 && <div className={styles.empty}>Тесты не найдены</div>}
			</div>
		</div>
	);
};
