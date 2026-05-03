import 'react-datepicker/dist/react-datepicker.css';
import './DatePickerApp.scss';

import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import classNames from 'classnames';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import DatePicker, { ReactDatePickerCustomHeaderProps } from 'react-datepicker';

import { ButtonToday } from './button-today/ButtonToday';
import styles from './DatePickerApp.module.scss';

interface DatePickerAppProps extends Partial<ReactDatePickerCustomHeaderProps>{
    initialValue?: Date | null;
    onSelectValue?: (e: Date | null) => void;
    minDate?: Date;
    maxDate?: Date | null;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    inputClassName?: string;
    wrapperClassName?: string;
}

/**
 * Компонент обертка для DataPicker из `react-datepicker`
 */
export const DatePickerApp = ({
	initialValue,
	onSelectValue,
	minDate,
	maxDate,
	placeholder = 'Выберите дату',
	disabled = false,
	className,
	inputClassName,
	wrapperClassName,
	...propsPicker
}: DatePickerAppProps) => {

	const [value, setValue] = useState<Date | null>(initialValue || new Date());

	const onSelectDate = (e: Date | null) => {
		setValue(e);

		onSelectValue?.(e);
	};

	return (
		<div className={classNames(styles.wrapper, className)}>
			<DatePicker
				selected={value}
				onChange={onSelectDate}
				minDate={minDate}
				maxDate={maxDate || undefined}
				placeholderText={placeholder}
				disabled={disabled}
				dateFormat="d MMMM yyyy"
				wrapperClassName={classNames(wrapperClassName)}
				locale={ru}
				popperClassName={styles.datePickerPopper}
				showPopperArrow={false}
				todayButton={<ButtonToday/>}
				customInput={
					<input className={classNames(styles.datePicker, inputClassName)} />
				}
				portalId={'portal'}
				withPortal
				showIcon
				icon={<SmartIcon iconName="calendar"/>}
				{...propsPicker}
			/>
		</div>
	);
};