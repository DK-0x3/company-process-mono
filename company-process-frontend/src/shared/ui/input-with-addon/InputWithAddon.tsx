import cx from 'classnames';
import {
	FC, InputHTMLAttributes, ReactNode, useRef 
} from 'react';

import styles from './InputWithAddon.module.scss';

interface InputWithAddonProps extends InputHTMLAttributes<HTMLInputElement> {
    leftAddon?: ReactNode;
    rightAddon?: ReactNode;

    containerClassName?: string;
    inputClassName?: string;
    leftAddonClassName?: string;
    rightAddonClassName?: string;
}

/**
 * Поле ввода с дополнительными элементами (слева/справа)
 */
export const InputWithAddon: FC<InputWithAddonProps> = (
	{
		leftAddon,
		rightAddon,
		containerClassName,
		inputClassName,
		leftAddonClassName,
		rightAddonClassName,
		...otherProps
	}) => {
	const inputRef = useRef<HTMLInputElement>(null);

	const onClickWrapper = () => {
		inputRef.current?.focus();
	};

	return (
		<div
			className={cx(styles.inputWithAddon, containerClassName)}
			onClick={onClickWrapper}
		>
			{leftAddon && (
				<div className={cx(styles.addon, styles.leftAddon, leftAddonClassName)}>
					{leftAddon}
				</div>
			)}

			<input
				ref={inputRef}
				className={cx(styles.input, inputClassName)}
				{...otherProps}
			/>

			{rightAddon && (
				<div className={cx(styles.addon, styles.rightAddon, rightAddonClassName)}>
					{rightAddon}
				</div>
			)}
		</div>
	);
};