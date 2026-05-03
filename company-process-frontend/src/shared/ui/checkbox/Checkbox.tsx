import classNames from 'classnames';
import React, { FC, useState } from 'react';

import checkedIcon from './assets/checked.svg?url';
import styles from './Checkbox.module.scss';

type CheckboxProps = {
    initialChecked?: boolean;
    onChange?: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
    boxClassName?: string;
    // Если нужно управлять извне
    checkedManage?: boolean;
};

export const Checkbox: FC<CheckboxProps> = (
	{
		initialChecked = false,
		onChange,
		label,
		disabled = false,
		className,
		boxClassName,
		checkedManage,
	}) => {
	const [currentChecked, setCurrentChecked] = useState(initialChecked);

	const checked = checkedManage !== undefined ? checkedManage : currentChecked;

	const onToggle = (e: React.MouseEvent<HTMLDivElement>) => {
		if (disabled) return;
		e.stopPropagation();

		if (checkedManage !== undefined) {
			onChange?.(!checked);
			return;
		}

		setCurrentChecked((prev) => {
			const newValue = !prev;
			onChange?.(newValue);
			return newValue;
		});
	};

	return (
		<div className={classNames(styles.wrapper, className, {
			[styles.disabled]: disabled,
		})}>
			<input
				type="checkbox"
				disabled={disabled}
				checked={checked}
				style={{ display: 'none' }}
				onChange={()=> {}}
			/>

			<div
				className={classNames(styles.box, boxClassName)}
				onClick={onToggle}
			>
				{checked && (
					<img src={checkedIcon}/>
				)}
			</div>
		</div>
	);
};