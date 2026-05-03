import { UserHeader } from '@features/user/ui/user-header/UserHeader';
import { canEditEntity, canViewEntity } from '@entities/auth/lib/permissions';
import { selectAuthUser } from '@entities/auth/model/selectors';
import routes from '@shared/config/routes';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import classNames from 'classnames';
import { Link, NavLink } from 'react-router-dom';

import styles from './Navbar.module.scss';

export const Navbar = () => {
	const authUser = useAppSelector(selectAuthUser);
	const isEmployeeActor = authUser?.actorType === 'EMPLOYEE';
	const canViewTests = canViewEntity(authUser, 'tests');
	const canEditTests = canEditEntity(authUser, 'tests');

	return (
		<div className={styles.wrapper}>
			<Link
				className={styles.logoAndTitle}
				to={routes.HOME}
			>
				<SmartIcon iconName="logo" className={styles.logo}/>
				Start Set
			</Link>
			
			<div className={styles.navBar}>
				{isEmployeeActor ? (
					<>
						<NavLink
							to={routes.CABINET}
							className={({ isActive }) => classNames(styles.navLink, {
								[styles.active]: isActive,
							})}
						>
							Личный кабинет
						</NavLink>
						{canViewEntity(authUser, 'processes') && (
							<NavLink
								to={routes.HOME}
								className={({ isActive }) => classNames(styles.navLink, {
									[styles.active]: isActive,
								})}
							>
								Процессы
							</NavLink>
						)}
						{canViewEntity(authUser, 'positions') && (
							<NavLink
								to={routes.POSITION}
								className={({ isActive }) => classNames(styles.navLink, {
									[styles.active]: isActive,
								})}
							>
								Должности
							</NavLink>
						)}
						{canViewEntity(authUser, 'dataObjects') && (
							<NavLink
								to={routes.DATA_OBJECT}
								className={({ isActive }) => classNames(styles.navLink, {
									[styles.active]: isActive,
								})}
							>
								Объекты данных
							</NavLink>
						)}
						{canViewEntity(authUser, 'materials') && (
							<NavLink
								to={routes.MATERIAL}
								className={({ isActive }) => classNames(styles.navLink, {
									[styles.active]: isActive,
								})}
							>
								Материалы
							</NavLink>
						)}
						{canViewTests && (
							<NavLink
								to={routes.CABINET_TESTS}
								className={({ isActive }) => classNames(styles.navLink, {
									[styles.active]: isActive,
								})}
							>
								Мои тесты
							</NavLink>
						)}
						{canEditTests && (
							<NavLink
								to={routes.TEST}
								className={({ isActive }) => classNames(styles.navLink, {
									[styles.active]: isActive,
								})}
							>
								Управление тестами
							</NavLink>
						)}
					</>
				) : (
					<>
						<NavLink
							to={routes.HOME}
							className={({ isActive }) => classNames(styles.navLink, {
								[styles.active]: isActive,
							})}
						>
							Процессы и задачи
						</NavLink>

						<NavLink
							to={routes.EMPLOYEE}
							className={({ isActive }) => classNames(styles.navLink, {
								[styles.active]: isActive,
							})}
						>
							Сотрудники
						</NavLink>

						<NavLink
							to={routes.POSITION}
							className={({ isActive }) => classNames(styles.navLink, {
								[styles.active]: isActive,
							})}
						>
							Должности
						</NavLink>

						<NavLink
							to={routes.ROLE}
							className={({ isActive }) => classNames(styles.navLink, {
								[styles.active]: isActive,
							})}
						>
							Роли
						</NavLink>

						<NavLink
							to={routes.DATA_OBJECT}
							className={({ isActive }) => classNames(styles.navLink, {
								[styles.active]: isActive,
							})}
						>
							Объекты данных
						</NavLink>

						<NavLink
							to={routes.MATERIAL}
							className={({ isActive }) => classNames(styles.navLink, {
								[styles.active]: isActive,
							})}
						>
							Материалы
						</NavLink>

						<NavLink
							to={routes.TEST}
							className={({ isActive }) => classNames(styles.navLink, {
								[styles.active]: isActive,
							})}
						>
							Тесты
						</NavLink>
					</>
				)}
			</div>

			<UserHeader/>
		</div>
	);
};
