import { useWindowSize } from '@shared/lib/hooks/useWindowSize';
import { portal } from '@shared/ui/modal/ui/Modal';
import classNames from 'classnames';
import React, {
	useCallback,
	useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import ReactDOM from 'react-dom';

import ChevronDown from './assets/ChevronDownIcon';
import styles from './DropDownMenu.module.scss';
import DropDownMenuItem from './types/DropDownMenuItem';
import Placement from './types/Placement';

export interface DropDownMenuProps<ValueT> {
	items: DropDownMenuItem<ValueT>[];
	label?: React.ReactNode;
	onSelect?: (item: DropDownMenuItem<ValueT>) => void;
	placement?: Placement;

	className?: string;
	style?: React.CSSProperties;
	buttonClassName?: string;
	buttonStyle?: React.CSSProperties;
	menuClassName?: string;
	menuStyle?: React.CSSProperties;
	itemClassName?: string;
	itemStyle?: React.CSSProperties;

	menuMinWidth?: number;
	showSelectedItem?: boolean;
	selectedItemClassName?: string;

	initialSelectedItem?: DropDownMenuItem<ValueT>;
	isMenuMatchButtonWidth?: boolean;
}

export const DropDownMenu = <ValueT,>(
	{
		label = 'Menu',
		items,
		onSelect,
		placement = 'Bottom',
		className,
		style,
		buttonClassName,
		buttonStyle,
		menuClassName,
		menuStyle,
		itemClassName,
		itemStyle,
		menuMinWidth = 180,
		showSelectedItem = false,
		selectedItemClassName = '',
		initialSelectedItem,
		isMenuMatchButtonWidth = false,
	}: DropDownMenuProps<ValueT>) => {
	const [open, setOpen] = useState(false);
	const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({
		top: 0,
		left: 0 
	});
	const [selectedItem, setSelectedItem] = useState<DropDownMenuItem<ValueT> | null>(
		initialSelectedItem ?? null
	);
	const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
	const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined);

	const rootRef = useRef<HTMLDivElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const wasOpened = useRef(false);
	const menuId = useId();

	const { width: windowWidth } = useWindowSize();

	useEffect(() => {
		const onClickOutside = (e: MouseEvent) => {
			if (!rootRef.current?.contains(e.target as Node)) {
				setTimeout(() => setOpen(false), 0);
			}
		};
		document.addEventListener('click', onClickOutside);
		return () => document.removeEventListener('click', onClickOutside);
	}, []);

	const onKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (!open) return;

			if (e.key === 'Escape') {
				setOpen(false);
				buttonRef.current?.focus();
				return;
			}

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setHighlightedIndex((prev) => {
					const next = prev < items.length - 1 ? prev + 1 : 0;
					itemRefs.current[next]?.focus();
					return next;
				});
			}

			if (e.key === 'ArrowUp') {
				e.preventDefault();
				setHighlightedIndex((prev) => {
					const next = prev > 0 ? prev - 1 : items.length - 1;
					itemRefs.current[next]?.focus();
					return next;
				});
			}

			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				if (highlightedIndex >= 0) {
					const item = items[highlightedIndex];
					if (!item.disabled) {
						setSelectedItem(item);
						onSelect?.(item);
						setOpen(false);
						buttonRef.current?.focus();
					}
				}
			}
		},
		[
			open,
			items,
			highlightedIndex,
			onSelect
		]
	);

	useEffect(() => {
		if (open) {
			document.addEventListener('keydown', onKeyDown);

			if (!wasOpened.current) {
				let idx = 0;
				if (selectedItem) {
					const found = items.findIndex((i) => i.value === selectedItem.value);
					if (found >= 0) idx = found;
				}
				setHighlightedIndex(idx);
				setTimeout(() => itemRefs.current[idx]?.focus(), 0);

				wasOpened.current = true;
			}
		} else {
			document.removeEventListener('keydown', onKeyDown);
			setHighlightedIndex(-1);
			wasOpened.current = false;
		}
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [
		open,
		onKeyDown,
		items,
		selectedItem
	]);

	useLayoutEffect(() => {
		if (open && buttonRef.current) {
			setButtonWidth(buttonRef.current.offsetWidth);
			const buttonRect = buttonRef.current.getBoundingClientRect();
			const scrollY = window.scrollY;
			const scrollX = window.scrollX;
			const menuEl = document.getElementById(menuId);
			if (!menuEl) return;

			requestAnimationFrame(() => {
				const menuRect = menuEl.getBoundingClientRect();
				const offset = 8;
				let top = 0, left = 0;

				switch (placement) {
				case 'Bottom':
					top = buttonRect.bottom + scrollY + offset;
					left = buttonRect.left + scrollX + buttonRect.width / 2 - menuRect.width / 2;
					break;
				case 'Top':
					top = buttonRect.top + scrollY - menuRect.height - offset;
					left = buttonRect.left + scrollX + buttonRect.width / 2 - menuRect.width / 2;
					break;
				case 'Left':
					top = buttonRect.top + scrollY + buttonRect.height / 2 - menuRect.height / 2;
					left = buttonRect.left + scrollX - menuRect.width - offset;
					break;
				case 'Right':
					top = buttonRect.top + scrollY + buttonRect.height / 2 - menuRect.height / 2;
					left = buttonRect.right + scrollX + offset;
					break;
				}

				const viewportWidth = window.innerWidth;
				const viewportHeight = window.innerHeight;
				if (left < 0) left = 4;
				if (left + menuRect.width > viewportWidth) left = viewportWidth - menuRect.width - 4;
				if (top < 0) top = 4;
				if (top + menuRect.height > viewportHeight + scrollY)
					top = viewportHeight + scrollY - menuRect.height - 4;

				setMenuPos({
					top,
					left 
				});
			});
		}
	}, [
		open,
		placement,
		menuId,
		windowWidth
	]);

	const menuItems = useMemo(
		() =>
			items.map((item, idx) => {
				const itemId = `dropdown-item-${idx}`;
				const isSelected = selectedItem && selectedItem.value === item.value;
				const isHighlighted = highlightedIndex === idx;

				return (
					<li key={itemId} role="none">
						<button
							ref={(el) => {
								itemRefs.current[idx] = el;
							}}
							role="menuitem"
							type="button"
							aria-disabled={item.disabled || undefined}
							disabled={item.disabled}
							className={classNames(styles.item, itemClassName,
								{
									[styles.selected]: isSelected,
									[styles.highlighted]: isHighlighted,
									[selectedItemClassName!]: isSelected && selectedItemClassName,
								}
							)}
							style={itemStyle}
							onClick={(e) => {
								e.stopPropagation();
								if (item.disabled) return;
								setSelectedItem(item);
								onSelect?.(item);
								setOpen(false);
								buttonRef.current?.focus();
							}}
						>
							{item.icon && <span aria-hidden>{item.icon}</span>}
							<span>{item.label}</span>
						</button>
					</li>
				);
			}),
		[
			items,
			selectedItem,
			showSelectedItem,
			itemClassName,
			itemStyle,
			onSelect,
			selectedItemClassName
		]
	);

	const menuContent = (
		<ul
			id={menuId}
			role="menu"
			aria-label="Dropdown menu"
			className={classNames(
				styles.menu,
				styles[`placement${placement}`],
				menuClassName,
				{ [styles.open]: open }
			)}
			style={{
				top: menuPos.top,
				left: menuPos.left,
				minWidth: menuMinWidth,
				width: isMenuMatchButtonWidth ? buttonWidth : undefined,
				...menuStyle,
			}}
		>
			{menuItems}
			{menuItems.length === 0 && <span>Пусто</span>}
		</ul>
	);

	return (
		<div
			ref={rootRef}
			className={classNames(styles.wrapper, className)}
			style={{
				display: 'inline-block',
				...style 
			}}
		>
			<button
				ref={buttonRef}
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={menuId}
				className={classNames(styles.mainButton, buttonClassName)}
				style={{ ...buttonStyle }}
				onClick={() => setOpen((p) => !p)}
			>
				{showSelectedItem && selectedItem ? selectedItem.label : label}
				<ChevronDown rotated={open ? 180 : 0} />
			</button>

			{ReactDOM.createPortal(menuContent, portal!)}
		</div>
	);
};
