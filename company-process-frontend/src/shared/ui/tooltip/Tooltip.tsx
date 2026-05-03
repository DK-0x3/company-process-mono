import { useTooltipPosition } from '@shared/ui/tooltip/hooks/useTooltipPosition';
import classNames from 'classnames';
import {
	CSSProperties,
	FC,
	ReactElement,
	ReactNode,
	useEffect,
	useRef,
	useState,
} from 'react';

import Placement from '../drop-down-menu/types/Placement';
import styles from './Tooltip.module.scss';

export interface TooltipProps {
    /** Контент тултипа */
    content: ReactNode;
    /** Элемент-триггер */
    children: ReactElement;
    /** Позиция */
    placement?: Placement;
    /** Задержка появления в мс */
    showDelay?: number;
	/** Задержка скрытия в мс */
	hideDelay?: number;
    /** Кастомный класс */
    className?: string;
    /** Inline-стили тултипа */
    style?: CSSProperties;
    /** Отступ от родителя */
    offset?: number;
	/** Разрешить ли оставаться открытым при наведении на тултип */
	interactive?: boolean;
}

/**
 * Компонент всплывающей подсказки (Tooltip).
 *
 * Особенности:
 * - Показывается при наведении мыши или фокусе на элементе-триггере
 * - Поддерживает задержку появления (`delay`) и задержку скрытия (`hideDelay`)
 * - Автоматически позиционируется относительно элемента-триггера
 * - Учитывает границы экрана (не выходит за пределы viewport)
 * - Опционально поддерживает "интерактивный" режим (`interactive`), при котором
 *   тултип не скрывается при наведении курсора на сам тултип
 *
 * @example
 * ```tsx
 * <Tooltip content="Подсказка" placement="Bottom" delay={200} hideDelay={150}>
 *   <button>Наведи на меня</button>
 * </Tooltip>
 * ```
 * @returns {JSX.Element} Tooltip-обёртка с элементом-триггером и тултипом
 */
export const Tooltip: FC<TooltipProps> = ({
	content,
	children,
	placement = 'Top',
	showDelay = 150,
	hideDelay = 150,
	className,
	style,
	offset = 8,
	interactive = true,
}) => {
	const [visible, setVisible] = useState(false);
	
	const showTimerRef = useRef<number | null>(null);
	const hideTimerRef = useRef<number | null>(null);

	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const tooltipRef = useRef<HTMLDivElement | null>(null);

	const coords = useTooltipPosition(wrapperRef, tooltipRef, placement, offset, visible);

	const show = () => {
		if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
		if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);

		showTimerRef.current = window.setTimeout(() => {
			setVisible(true);
		}, showDelay);
	};

	const hide = () => {
		if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
		if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);

		hideTimerRef.current = window.setTimeout(() => {
			setVisible(false);
		}, hideDelay);
	};

	// очистка таймеров при размонтировании
	useEffect(() => {
		return () => {
			if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
			if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
		};
	}, []);

	return (
		<>
			<div
				ref={wrapperRef}
				onMouseEnter={show}
				onMouseLeave={hide}
				onFocus={show}
				onBlur={hide}
				style={{ display: 'inline-block' }}
			>
				{children}
			</div>

			{visible && <div
				ref={tooltipRef}
				role="tooltip"
				aria-hidden={!visible}
				className={classNames(
					styles.Tooltip,
					styles[`Tooltip${placement}`],
					{ [styles.TooltipShow]: visible },
					className
				)}
				style={{
					top: coords.top,
					left: coords.left,
					...style,
				}}
				onMouseEnter={() => {
					if (interactive && hideTimerRef.current) {
						window.clearTimeout(hideTimerRef.current);
					}
				}}
				onMouseLeave={() => {
					if (interactive) hide();
				}}
			>
				{content}
			</div>}
		</>
	);
};
