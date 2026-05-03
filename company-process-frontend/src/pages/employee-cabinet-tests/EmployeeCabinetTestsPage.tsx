import { cabinetAPI } from '@entities/cabinet/api/api';
import { EmployeeCabinetTestListItem } from '@entities/cabinet/model/types/EmployeeCabinet';
import routes from '@shared/config/routes';
import { InputWithAddon } from '@shared/ui/input-with-addon/InputWithAddon';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './EmployeeCabinetTestsPage.module.scss';

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

export const EmployeeCabinetTestsPage = () => {
	const navigate = useNavigate();
	const [search, setSearch] = useState('');

	const { data: tests, isLoading } = cabinetAPI.useGetTestsQuery();

	const filtered = useMemo(() => {
		const searchLower = normalizeText(search);
		return (tests ?? []).filter((test) => {
			if (!searchLower) return true;
			return normalizeText(test.name).includes(searchLower)
				|| normalizeText(test.description ?? '').includes(searchLower);
		});
	}, [tests, search]);

	const onOpen = (test: EmployeeCabinetTestListItem) => {
		navigate(`/cabinet/tests/${test.id}/pass`);
	};

	if (isLoading) {
		return <div className={styles.wrapper}>Загрузка тестов...</div>;
	}

	return (
		<div className={styles.wrapper}>
			<div className={styles.hero}>
				<div>
					<h1 className={styles.title}>Тесты сотрудника</h1>
					<p className={styles.subtitle}>Доступные вам тесты. Каждый тест можно пройти только один раз.</p>
				</div>
				<div className={styles.metricCard}>
					<span>Доступно тестов</span>
					<b>{tests?.length ?? 0}</b>
				</div>
			</div>

			<div className={styles.toolbar}>
				<InputWithAddon
					containerClassName={styles.search}
					inputClassName={styles.searchInput}
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					leftAddon={<SmartIcon iconName={'search'} className={styles.searchIcon} />}
				/>
				<button className={styles.backButton} onClick={() => navigate(routes.CABINET)}>Назад в кабинет</button>
			</div>

			<div className={styles.tableCard}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Название</th>
							<th>Время</th>
							<th>Вопросов</th>
							<th>Статус</th>
							<th>Обновлено</th>
							<th>Действия</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((test) => {
							const hasResult = Boolean(test.myResult);
							return (
								<tr key={test.id}>
									<td>
										<div className={styles.itemTitle}>{test.name}</div>
										<div className={styles.itemSub}>{test.description ?? 'Без описания'}</div>
									</td>
									<td>{test.timeLimitMinutes} мин</td>
									<td>{test.questions?.length ?? 0}</td>
									<td>
										<span className={hasResult ? styles.statusDone : styles.statusPending}>
											{hasResult ? 'Пройден' : 'Не пройден'}
										</span>
									</td>
									<td>{formatDate(test.updatedAt)}</td>
									<td>
										<button className={styles.actionButton} onClick={() => onOpen(test)}>
											{hasResult ? 'Результат' : 'Пройти'}
										</button>
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
