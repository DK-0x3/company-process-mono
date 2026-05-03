import { portal } from '@shared/ui/modal/ui/Modal';
import classNames from 'classnames';
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

import ChevronDown from './assets/ChevronDownIcon';
import styles from './DropDownMenu.module.scss';

export interface MultiSelectOption {
	value: number;
	label: React.ReactNode;
	description?: React.ReactNode;
	disabled?: boolean;
}

interface MultiSelectDropDownProps {
	items: MultiSelectOption[];
	selectedValues: number[];
	onChange: (selectedValues: number[]) => void;
	placeholder?: React.ReactNode;
	className?: string;
	buttonClassName?: string;
	menuClassName?: string;
	itemClassName?: string;
	isMenuMatchButtonWidth?: boolean;
}

export const MultiSelectDropDown = ({
	items,
	selectedValues,
	onChange,
	placeholder = 'Выберите элементы',
	className,
	buttonClassName,
	menuClassName,
	itemClassName,
	isMenuMatchButtonWidth = true,
}: MultiSelectDropDownProps) => {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLUListElement | null>(null);
	const menuId = useId();

	const [open, setOpen] = useState(false);
	const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
	const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined);

	useEffect(() => {
		const onClickOutside = (event: MouseEvent) => {
			const targetNode = event.target as Node;
			const isInsideRoot = rootRef.current?.contains(targetNode);
			const isInsideMenu = menuRef.current?.contains(targetNode);

			if (!isInsideRoot && !isInsideMenu) {
				setOpen(false);
			}
		};

		if (open) {
			document.addEventListener('mousedown', onClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', onClickOutside);
		};
	}, [open]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setOpen(false);
				buttonRef.current?.focus();
			}
		};

		if (open) {
			document.addEventListener('keydown', onKeyDown);
		}

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	useLayoutEffect(() => {
		if (!open || !buttonRef.current) return;

		setButtonWidth(buttonRef.current.offsetWidth);
		const rect = buttonRef.current.getBoundingClientRect();
		const menuEl = document.getElementById(menuId);
		if (!menuEl) return;

		requestAnimationFrame(() => {
			const menuRect = menuEl.getBoundingClientRect();
			let top = rect.bottom + window.scrollY + 8;
			let left = rect.left + window.scrollX;

			if (left + menuRect.width > window.innerWidth - 4) {
				left = window.innerWidth - menuRect.width - 4;
			}
			if (left < 4) left = 4;

			if (top + menuRect.height > window.scrollY + window.innerHeight - 4) {
				top = rect.top + window.scrollY - menuRect.height - 8;
			}
			if (top < window.scrollY + 4) {
				top = window.scrollY + 4;
			}

			setMenuPos({ top, left });
		});
	}, [open, menuId]);

	const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

	const selectedLabel = useMemo(() => {
		if (selectedValues.length === 0) return placeholder;
		if (selectedValues.length === 1) {
			const item = items.find((option) => option.value === selectedValues[0]);
			return item?.label ?? `Выбран 1 элемент`;
		}
		return `Выбрано: ${selectedValues.length}`;
	}, [items, placeholder, selectedValues]);

	const toggleValue = (value: number) => {
		if (selectedSet.has(value)) {
			onChange(selectedValues.filter((id) => id !== value));
			return;
		}

		onChange([...selectedValues, value].sort((a, b) => a - b));
	};

	const menuContent = (
		<ul
			ref={menuRef}
			id={menuId}
			role="listbox"
			aria-multiselectable="true"
			className={classNames(styles.menu, styles.open, styles.multiMenu, menuClassName)}
			style={{
				top: menuPos.top,
				left: menuPos.left,
				width: isMenuMatchButtonWidth ? buttonWidth : undefined,
				minWidth: 220,
			}}
		>
			{items.length > 0 ? items.map((item) => {
				const selected = selectedSet.has(item.value);
				return (
					<li key={item.value} role="option" aria-selected={selected}>
						<button
							type="button"
							disabled={item.disabled}
							className={classNames(styles.item, styles.multiItem, itemClassName, {
								[styles.multiItemSelected]: selected,
							})}
							onClick={(event) => {
								event.stopPropagation();
								if (item.disabled) return;
								toggleValue(item.value);
							}}
						>
							<span className={styles.multiCheckbox} aria-hidden>
								{selected ? '✓' : ''}
							</span>
							<span className={styles.multiText}>
								<span>{item.label}</span>
								{item.description && (
									<span className={styles.multiDescription}>{item.description}</span>
								)}
							</span>
						</button>
					</li>
				);
			}) : (
				<li className={styles.multiEmpty}>Пусто</li>
			)}
		</ul>
	);

	return (
		<div ref={rootRef} className={classNames(styles.wrapper, styles.multiRoot, className)}>
			<button
				ref={buttonRef}
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={menuId}
				className={classNames(styles.mainButton, styles.multiButtonFull, buttonClassName)}
				onClick={() => setOpen((prev) => !prev)}
			>
				{selectedLabel}
				<ChevronDown rotated={open ? 180 : 0} />
			</button>

			{open && ReactDOM.createPortal(menuContent, portal!)}
		</div>
	);
};
