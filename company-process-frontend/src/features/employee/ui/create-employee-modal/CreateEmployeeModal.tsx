import { employeeAPI } from '@entities/employee/api/api';
import { employeeActions, employeeSelections } from '@entities/employee/model/slice';
import { positionAPI } from '@entities/position/api/api';
import { Position } from '@entities/position/model/types/Position';
import { EmployeePermissions } from '@entities/employee/model/types/Employee';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { useAppSelector } from '@shared/lib/store/hooks/useAppSelector';
import { DatePickerApp } from '@shared/ui/date-picker/DatePickerApp';
import { DropDownMenu } from '@shared/ui/drop-down-menu/DropDownMenu';
import DropDownMenuItem from '@shared/ui/drop-down-menu/types/DropDownMenuItem';
import { Modal } from '@shared/ui/modal/ui/Modal';
import { Checkbox } from '@shared/ui/checkbox/Checkbox';
import classNames from 'classnames';
import { useMemo, useState } from 'react';

import styles from './CreateEmployeeModal.module.scss';

const permissionRows: Array<{
	key: keyof EmployeePermissions;
	editKey: keyof EmployeePermissions;
	label: string;
}> = [
	{ key: 'canViewProcesses', editKey: 'canEditProcesses', label: 'Процессы' },
	{ key: 'canViewTasks', editKey: 'canEditTasks', label: 'Задачи' },
	{ key: 'canViewPositions', editKey: 'canEditPositions', label: 'Должности' },
	{ key: 'canViewDataObjects', editKey: 'canEditDataObjects', label: 'Объекты данных' },
	{ key: 'canViewMaterials', editKey: 'canEditMaterials', label: 'Материалы' },
	{ key: 'canViewTests', editKey: 'canEditTests', label: 'Тесты' },
];

export const CreateEmployeeModal = () => {
	const dispatch = useAppDispatch();
	
	const isActive = useAppSelector(employeeSelections.isActiveCreateModal);
	const createEmployeeData = useAppSelector(employeeSelections.createData);
	
	const [isErrorName, setIsErrorName] = useState<boolean>(false);
	const [isErrorBirthDate, setIsErrorBirthDate] = useState<boolean>(false);
	const [isErrorHireDate, setIsErrorHireDate] = useState<boolean>(false);
	const [isErrorEmail, setIsErrorEmail] = useState<boolean>(false);
	const [isErrorPositionId, setIsErrorPositionId] = useState<boolean>(false);
	const [isErrorAccountLogin, setIsErrorAccountLogin] = useState<boolean>(false);
	const [isErrorAccountPassword, setIsErrorAccountPassword] = useState<boolean>(false);

	const { data: positions } = positionAPI.useGetAllQuery();
	const [createEmployee] = employeeAPI.useCreateMutation();
	
	const positionMenuItems = useMemo(() => {
		if (!positions) return [];

		const resultMenuItems: DropDownMenuItem<Position>[] = [];

		positions.forEach((position) => {
			resultMenuItems.push({
				label: position.name,
				value: position,
			});
		});

		return resultMenuItems;
	}, [positions]);
	
	const onUpdateName = (value: string) => {
		dispatch(employeeActions.setCreateData({
			fullName: value,
		}));
	};

	const onUpdateEmail = (value: string) => {
		dispatch(employeeActions.setCreateData({
			email: value,
		}));
	};

	const onUpdatePhone = (value: string) => {
		dispatch(employeeActions.setCreateData({
			phone: value,
		}));
	};

	const onUpdateAddress = (value: string) => {
		dispatch(employeeActions.setCreateData({
			address: value,
		}));
	};

	const onUpdateBirthDate = (value: Date | null) => {
		if (!value) return;

		dispatch(employeeActions.setCreateData({
			birthDate: value,
		}));
	};

	const onUpdateHireDate = (value: Date | null) => {
		if (!value) return;

		dispatch(employeeActions.setCreateData({
			hireDate: value,
		}));
	};

	const onUpdatePosition = (value: Position) => {
		dispatch(employeeActions.setCreateData({
			positionId: value.id,
		}));
	};

	const onUpdateAccountLogin = (value: string) => {
		dispatch(employeeActions.setCreateData({
			accountLogin: value,
		}));
	};

	const onUpdateAccountPassword = (value: string) => {
		dispatch(employeeActions.setCreateData({
			accountPassword: value,
		}));
	};

	const onTogglePermissionView = (key: keyof EmployeePermissions, checked: boolean) => {
		const currentPermissions = createEmployeeData.permissions ?? {};
		const row = permissionRows.find((item) => item.key === key);
		if (!row) return;
		const editChecked = Boolean(currentPermissions[row.editKey]);

		dispatch(employeeActions.setCreateData({
			permissions: {
				...currentPermissions,
				[key]: checked || editChecked,
			},
		}));
	};

	const onTogglePermissionEdit = (editKey: keyof EmployeePermissions, checked: boolean) => {
		const currentPermissions = createEmployeeData.permissions ?? {};
		const row = permissionRows.find((item) => item.editKey === editKey);
		if (!row) return;

		dispatch(employeeActions.setCreateData({
			permissions: {
				...currentPermissions,
				[editKey]: checked,
				[row.key]: checked ? true : Boolean(currentPermissions[row.key]),
			},
		}));
	};
	
	const onCreate = () => {
		let isError = false;
		setIsErrorName(false);
		setIsErrorEmail(false);
		setIsErrorBirthDate(false);
		setIsErrorHireDate(false);
		setIsErrorPositionId(false);
		setIsErrorAccountLogin(false);
		setIsErrorAccountPassword(false);

		if (createEmployeeData.fullName.trim().length === 0) {
			setIsErrorName(true);
			isError = true;
		}

		if (!createEmployeeData.email || createEmployeeData.email.trim().length === 0) {
			setIsErrorEmail(true);
			isError = true;
		}

		if (!createEmployeeData.birthDate) {
			setIsErrorBirthDate(true);
			isError = true;
		}

		if (!createEmployeeData.hireDate) {
			setIsErrorHireDate(true);
			isError = true;
		}

		if (!createEmployeeData.positionId) {
			setIsErrorPositionId(true);
			isError = true;
		}

		const accountLogin = createEmployeeData.accountLogin?.trim() ?? '';
		const accountPassword = createEmployeeData.accountPassword?.trim() ?? '';
		if ((accountLogin && !accountPassword) || (!accountLogin && accountPassword)) {
			setIsErrorAccountLogin(!accountLogin);
			setIsErrorAccountPassword(!accountPassword);
			isError = true;
		}

		if (isError) return;

		createEmployee({
			...createEmployeeData,
			accountLogin: accountLogin || undefined,
			accountPassword: accountPassword || undefined,
		});

		onClose();
	};
	
	const onClose = () => {
		dispatch(employeeActions.setIsActiveCreateModal(false));
		dispatch(employeeActions.clearCreateData());
		setIsErrorName(false);
		setIsErrorEmail(false);
		setIsErrorBirthDate(false);
		setIsErrorHireDate(false);
		setIsErrorPositionId(false);
		setIsErrorAccountLogin(false);
		setIsErrorAccountPassword(false);
	};
	
	return (
		<Modal
			isActive={isActive}
			onClose={onClose}
			contentClassName={styles.wrapper}
		>
			<div className={styles.content}>
				<h2>Создание сотрудника</h2>

				<div className={styles.mainGrid}>
					<div>
						<label>ФИО</label>
						<input
							className={classNames(styles.input, {
								[styles.errorInput]: isErrorName
							})}
							value={createEmployeeData.fullName}
							onChange={(e) => onUpdateName(e.target.value)}
						/>
					</div>

					<div>
						<label>Почта</label>
						<input
							className={classNames(styles.input, {
								[styles.errorInput]: isErrorEmail
							})}
							value={createEmployeeData.email}
							onChange={(e) => onUpdateEmail(e.target.value)}
						/>
					</div>

					<div>
						<label>Телефон</label>
						<input
							className={classNames(styles.input)}
							value={createEmployeeData.phone ?? ''}
							onChange={(e) => onUpdatePhone(e.target.value)}
						/>
					</div>

					<div>
						<label>Адрес</label>
						<input
							className={classNames(styles.input)}
							value={createEmployeeData.address ?? ''}
							onChange={(e) => onUpdateAddress(e.target.value)}
						/>
					</div>

					<div className={styles.positionContainer}>
						<label>Должность</label>
						<DropDownMenu
							items={positionMenuItems}
							buttonClassName={classNames(styles.button, {
								[styles.errorInput]: isErrorPositionId,
							})}
							isMenuMatchButtonWidth={true}
							label="Выберите должность"
							showSelectedItem={true}
							onSelect={(item) => onUpdatePosition(item.value)}
						/>
					</div>

					<div className={styles.dateContainer}>
						<label>Дата рождения</label>
						<DatePickerApp
							wrapperClassName={styles.container}
							inputClassName={classNames(styles.input, {
								[styles.errorInput]: isErrorBirthDate,
							})}
							onSelectValue={onUpdateBirthDate}
						/>
					</div>

					<div className={classNames(styles.dateContainer, styles.hireDateContainer)}>
						<label>Дата трудоустройства</label>
						<DatePickerApp
							wrapperClassName={styles.container}
							inputClassName={classNames(styles.input, {
								[styles.errorInput]: isErrorHireDate,
							})}
							onSelectValue={onUpdateHireDate}
						/>
					</div>

					<div>
						<label>Логин ЛК (опционально)</label>
						<input
							className={classNames(styles.input, {
								[styles.errorInput]: isErrorAccountLogin
							})}
							value={createEmployeeData.accountLogin ?? ''}
							onChange={(e) => onUpdateAccountLogin(e.target.value)}
						/>
					</div>

					<div>
						<label>Пароль ЛК (опционально)</label>
						<input
							className={classNames(styles.input, {
								[styles.errorInput]: isErrorAccountPassword
							})}
							value={createEmployeeData.accountPassword ?? ''}
							onChange={(e) => onUpdateAccountPassword(e.target.value)}
						/>
					</div>
				</div>

				<div className={styles.permissionsSection}>
					<h3>Права доступа сотрудника</h3>
					<div className={styles.permissionsHeader}>
						<span>Сущность</span>
						<span>Просмотр</span>
						<span>Редактирование</span>
					</div>

					<div className={styles.permissionsTable}>
						{permissionRows.map((row) => {
							const permissions = createEmployeeData.permissions ?? {};
							const viewChecked = Boolean(permissions[row.key]);
							const editChecked = Boolean(permissions[row.editKey]);

							return (
								<div key={row.key} className={styles.permissionsRow}>
									<span className={styles.permissionEntity}>{row.label}</span>
									<label className={styles.permissionToggle}>
										<Checkbox
											checkedManage={viewChecked}
											onChange={(checked) => onTogglePermissionView(row.key, checked)}
										/>
									</label>
									<label className={styles.permissionToggle}>
										<Checkbox
											checkedManage={editChecked}
											onChange={(checked) => onTogglePermissionEdit(row.editKey, checked)}
										/>
									</label>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			<button
				className={styles.createButton}
				onClick={onCreate}
			>
				Создать
			</button>
		</Modal>
	);
};
