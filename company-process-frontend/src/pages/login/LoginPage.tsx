import { authAPI } from '@entities/auth/api/api';
import { authActions } from '@entities/auth/model/slice';
import routes from '@shared/config/routes';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { InputWithAddon } from '@shared/ui/input-with-addon/InputWithAddon';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import styles from './LoginPage.module.scss';
import toast from "react-hot-toast";

export const LoginPage: React.FC = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	
	const [login, setLogin] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [employeeMode, setEmployeeMode] = useState(false);
	const [textError, setTextError] = useState('');
	
	const [loginUser] = authAPI.useLoginMutation();
	const [employeeLogin] = authAPI.useEmployeeLoginMutation();

	const toggleShowPassword = () => {
		setShowPassword(!showPassword);
	};

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!login.trim() || !password.trim()) {
			setTextError('Заполните все поля');
			return;
		}

		setTextError('');

		const action = employeeMode ? employeeLogin : loginUser;
		const { data } = await action({
			login: login,
			password: password,
		});

		if (!data) {
			toast('Неверный логин или пароль');
			return;
		}
		
		dispatch(authActions.setUser(data.user));
		dispatch(authActions.setToken(data.token));

		navigate(data.user.actorType === 'EMPLOYEE' ? routes.CABINET : routes.HOME);
	};

	const showIcon = () => (
		<SmartIcon
			iconName={showPassword ? 'eye-show' : 'eye-close'}
			className={styles.passwordIcon}
			onClick={toggleShowPassword}
		/>
	);

	return (
		<div className={styles.wrapper}>
			<form className={styles.form} onSubmit={onSubmit}>
				<h2 className={styles.title}>Войти</h2>

				<div className={styles.modeSwitcher}>
					<button
						type="button"
						className={employeeMode ? styles.modeButton : styles.modeButtonActive}
						onClick={() => setEmployeeMode(false)}
					>
						Владелец
					</button>
					<button
						type="button"
						className={employeeMode ? styles.modeButtonActive : styles.modeButton}
						onClick={() => setEmployeeMode(true)}
					>
						Сотрудник
					</button>
				</div>

				<label className={styles.label}>
					Логин
					<input
						type="text"
						value={login}
						onChange={(e) => setLogin(e.target.value)}
						className={styles.input}
						required
					/>
				</label>

				<label className={styles.label}>
					Пароль
					<InputWithAddon
						containerClassName={styles.passwordContainer}
						inputClassName={styles.passwordInput}
						type={showPassword ? 'text' : 'password'}
						value={password}
						onChange={(e) => setPassword(e.target.value)}

						rightAddon={showIcon()}
					/>
				</label>

				<button type="submit" className={styles.button}>
					Войти
				</button>

				<Link to={routes.REGISTER} className={styles.link}>
					Регистрация
				</Link>
			</form>

			<label className={styles.error}>{textError}</label>
		</div>
	);
};
