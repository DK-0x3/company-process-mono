import Placement from '@shared/ui/drop-down-menu/types/Placement';
import {
	RefObject,
	useEffect, useLayoutEffect, useState
} from 'react';

const useIsoLayoutEffect
    = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface Position {
    top: number;
    left: number;
}

/**
 * Хук для вычисления позиции тултипа относительно элемента-триггера.
 *
 * Автоматически учитывает:
 * - выбранное направление (`placement`)
 * - отступ (`offset`)
 * - скролл и ресайз окна
 * - размеры самого тултипа и триггера (через ResizeObserver)
 *
 * ⚡ При видимости (`visible = true`) пересчитывает позицию в `requestAnimationFrame`,
 * чтобы отобразить тултип уже после применения CSS классов.
 *
 * @param {RefObject<HTMLElement> | MutableRefObject<HTMLElement | null>} wrapperRef - ref на элемент-триггер
 * @param {RefObject<HTMLElement> | MutableRefObject<HTMLElement | null>} tooltipRef - ref на элемент тултипа
 * @param {Placement} placement - направление появления тултипа ("Top", "Bottom", "Left", "Right")
 * @param {number} offset - отступ между триггером и тултипом (в px)
 * @param {boolean} visible - текущее состояние видимости тултипа
 *
 * @returns {{ top: number, left: number }} Координаты тултипа для позиционирования
 */
export function useTooltipPosition(
	wrapperRef: RefObject<HTMLDivElement | null>,
	tooltipRef: RefObject<HTMLDivElement | null>,
	placement: Placement,
	offset: number,
	visible: boolean
): Position {
	const [coords, setCoords] = useState<Position>({
		top: 0,
		left: 0 
	});

	const updatePosition = () => {
		if (!wrapperRef.current || !tooltipRef.current) return;

		const triggerRect = wrapperRef.current.getBoundingClientRect();
		const tooltipRect = tooltipRef.current.getBoundingClientRect();

		let top = 0;
		let left = 0;

		switch (placement) {
		case 'Top':
			top = triggerRect.top - tooltipRect.height - offset;
			left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
			break;
		case 'Bottom':
			top = triggerRect.bottom + offset;
			left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
			break;
		case 'Left':
			top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
			left = triggerRect.left - tooltipRect.width - offset;
			break;
		case 'Right':
			top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
			left = triggerRect.right + offset;
			break;
		}

		// учитывать скролл
		top += window.scrollY;
		left += window.scrollX;

		const {
			innerWidth, innerHeight, scrollX, scrollY
		} = window;

		if (left < scrollX) left = scrollX + 5;
		if (top < scrollY) top = scrollY + 5;

		if (left + tooltipRect.width > scrollX + innerWidth) {
			left = scrollX + innerWidth - tooltipRect.width - 5;
		}
		if (top + tooltipRect.height > scrollY + innerHeight) {
			top = scrollY + innerHeight - tooltipRect.height - 5;
		}

		setCoords({
			top,
			left
		});
	};

	useIsoLayoutEffect(() => {
		if (!visible) return;

		const onScrollOrResize = () => updatePosition();
		const raf = requestAnimationFrame(updatePosition);

		window.addEventListener('scroll', onScrollOrResize, true);
		window.addEventListener('resize', onScrollOrResize);

		const ro = new ResizeObserver(() => updatePosition());
		if (tooltipRef.current) ro.observe(tooltipRef.current);
		if (wrapperRef.current) ro.observe(wrapperRef.current);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('scroll', onScrollOrResize, true);
			window.removeEventListener('resize', onScrollOrResize);
			ro.disconnect();
		};
	}, [
		visible,
		placement,
		offset
	]);

	// пересчитывать при смене placement
	useEffect(() => {
		if (visible) updatePosition();
	}, [placement, visible]);

	return coords;
}
