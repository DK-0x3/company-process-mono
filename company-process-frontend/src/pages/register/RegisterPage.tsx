import { authAPI } from '@entities/auth/api/api';
import { authActions } from '@entities/auth/model/slice';
import routes from '@shared/config/routes';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { InputWithAddon } from '@shared/ui/input-with-addon/InputWithAddon';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

import styles from './RegisterPage.module.scss';

const validateEmail = (value: string): boolean => {
	// простая регулярка для email
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(value.trim());
};

const RegisterPage: React.FC = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	
	const [login, setLogin] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [textError, setTextError] = useState('');
	
	const [registerUser] = authAPI.useRegisterMutation();

	const onToggleShowPassword = () => {
		setShowPassword(!showPassword);
	};

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!login.trim() || !email.trim() || !password.trim()) {
			setTextError('Заполните все поля');
			return;
		}

		if (!validateEmail(email)) {
			setTextError('Некорректный формат почты');
			return;
		}

		setTextError('');

		const { data } = await registerUser({
			login,
			email,
			password,
		});

		if (!data) {
			toast('Неверный логин или пароль');
			return;
		}

		dispatch(authActions.setUser(data.user));
		dispatch(authActions.setToken(data.token));

		navigate(routes.HOME);
	};

	const showIcon = () => (
		<SmartIcon
			iconName={showPassword ? 'eye-show' : 'eye-close'}
			className={styles.passwordIcon}
			onClick={onToggleShowPassword}
		/>
	);

	return (
		<div className={styles.wrapper}>
			<form className={styles.form} onSubmit={onSubmit}>
				<h2 className={styles.title}>Регистрация</h2>

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
					Почта
					<input
						type="text"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
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
					Зарегистрироваться
				</button>

				<Link to={routes.LOGIN} className={styles.link}>
					Войти
				</Link>
			</form>

			<label className={styles.error}>{textError}</label>
		</div>
	);
};

export default RegisterPage;
