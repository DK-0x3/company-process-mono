import { selectAuthUser } from '@entities/auth/model/selectors';
import { authActions } from '@entities/auth/model/slice';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import {
	useEffect,useRef, useState 
} from 'react';
import ReactDOM from 'react-dom';

import styles from './UserHeader.module.scss';

export const UserHeader = () => {
	const userData = useAppSelector(selectAuthUser);
	const dispatch = useAppDispatch();

	const [menuOpen, setMenuOpen] = useState(false);
	const buttonRef = useRef<HTMLDivElement>(null);

	// Закрытие при клике вне
	useEffect(() => {
		if (!menuOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (
				buttonRef.current
				&& !buttonRef.current.contains(e.target as Node)
			) {
				setMenuOpen(false);
			}
		};

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, [menuOpen]);

	if (!userData) {
		return null;
	}

	const onLogout = () => {
		dispatch(authActions.logout());
		setMenuOpen(false);
	};

	// Координаты для меню (по кнопке)
	const rect = buttonRef.current?.getBoundingClientRect();

	return (
		<>
			<div
				ref={buttonRef}
				className={styles.wrapper}
				onClick={() => setMenuOpen((prev) => !prev)}
			>
				<SmartIcon iconName={'human'} className={styles.icon} />
				<span className={styles.login}>{userData.fullName ?? userData.login}</span>
			</div>

			{menuOpen
				&& rect
				&& ReactDOM.createPortal(
					<div
						className={styles.menu}
						style={{
							top: rect.bottom + 8,
							right: window.innerWidth - rect.right,
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<div className={styles.menuItem}>
							<p className={styles.email}>{userData.email}</p>
							<p className={styles.email}>
								{userData.actorType === 'EMPLOYEE' ? 'Сотрудник' : 'Владелец workspace'}
							</p>
						</div>
						<div className={styles.divider} />
						<button className={styles.logoutBtn} onClick={onLogout}>
							{/*<SmartIcon iconName={'logout'} />*/}
							Выйти
						</button>
					</div>,
					document.body
				)}
		</>
	);
};
