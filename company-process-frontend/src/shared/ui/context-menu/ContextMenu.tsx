// @shared/ui/context-menu/ContextMenu.tsx
import { useOutsideClick } from '@shared/lib/hooks/useOutsideClick';
import { portal } from '@shared/ui/modal/ui/Modal';
import React from 'react';
import ReactDOM from 'react-dom';

import styles from './ContextMenu.module.scss';

export interface MenuItem {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	icon?: React.ReactNode;
}

export type Placement =
	| 'bottom-start'
	| 'bottom-end'
	| 'top-start'
	| 'top-end';

export interface ContextMenuProps<TAnchor extends HTMLElement = HTMLElement> {
	isOpen: boolean;
	onClose: () => void;
	items: MenuItem[];
	anchorRef: React.RefObject<TAnchor>;
	offset?: number;
	placement?: Placement;
}

export const ContextMenu = <TAnchor extends HTMLElement = HTMLElement>(
	{
		isOpen,
		onClose,
		items,
		anchorRef,
		offset = 6,
		placement = 'bottom-start',
	}: ContextMenuProps<TAnchor>) => {
	const menuRef = useOutsideClick<HTMLDivElement>({
		callback: () => {
			onClose();
		},
	});

	if (!isOpen || !anchorRef.current) return null;

	// Позиционирование относительно якоря
	const rect = anchorRef.current.getBoundingClientRect();

	let top = 0;
	let left = 0;

	switch (placement) {
	case 'bottom-start':
		top = rect.bottom + offset;
		left = rect.left;
		break;
	case 'bottom-end':
		top = rect.bottom + offset;
		left = rect.right;
		break;
	case 'top-start':
		top = rect.top - offset;
		left = rect.left;
		break;
	case 'top-end':
		top = rect.top - offset;
		left = rect.right;
		break;
	}

	// Рендерим через портал, чтобы меню было поверх таблицы/overflow
	return ReactDOM.createPortal(
		<div
			ref={menuRef}
			className={styles.menu}
			style={{
				position: 'fixed',
				top,
				left,
				transform:
					placement.endsWith('end') ? 'translateX(-100%)'
						: placement.startsWith('top') ? 'translateY(-100%)' : undefined,
			}}
			role="menu"
		>
			{items.map((item, i) => (
				<button
					key={i}
					type="button"
					className={styles.menuItem}
					onClick={() => {
						if (item.disabled) return;
						item.onClick();
						onClose();
					}}
					disabled={item.disabled}
					role="menuitem"
				>
					{item.icon && <span className={styles.icon}>{item.icon}</span>}
					{item.label}
				</button>
			))}
		</div>,
		portal as Element
	);
};
