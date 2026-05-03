import { OutsideTypeEvent } from '@shared/types/OutsideTypeEvent';
import {
	RefObject, useEffect, useRef
} from 'react';

interface UseOutsideProps {
	callback: () => void;
	isSkip?: boolean;
	exceptionId?: string;
	eventType?: OutsideTypeEvent;
}
/**
 * React-хук для обработки клика вне указанного элемента.
 * Generic:
 * Хук является дженериком (`<T extends HTMLElement = HTMLElement>`), что позволяет
 * типизировать `ref` под конкретный HTML-элемент (например, `HTMLDivElement`, `HTMLButtonElement`).
 *
 * @template T - Тип элемента, к которому будет привязан ref (по умолчанию `HTMLElement`).
 *
 * @param {() => void} callback - Функция, вызываемая при клике вне элемента.
 * @param {boolean} [skip=false] - Флаг, позволяющий временно отключить обработку.
 *   Если `true`, хук не будет вызывать `callback`.
 * @param {string} [exceptionId] - ID элемента-исключения. Если клик был внутри
 *   этого элемента или его потомков, `callback` не вызовется.
 * @param {'click' | 'mousedown' | 'mouseup'} [eventType='mousedown'] - Тип события,
 *   по которому будет отслеживаться клик.
 *
 * @returns {RefObject<T>} ref - React-ссылка, которую нужно повесить на отслеживаемый элемент.
 *
 * @example
 * // Базовое использование
 * const ref = useOutside<HTMLDivElement>(() => {
 *   console.log('Клик снаружи!');
 * });
 *
 * return <div ref={ref}>Контент</div>;
 *
 * @example
 * // Использование с исключением (например, кнопка открытия модалки)
 * const ref = useOutside<HTMLDivElement>(
 *   () => setOpen(false),
 *   false,
 *   'open-modal-button'
 * );
 *
 * return (
 *   <>
 *     <button id="open-modal-button" onClick={() => setOpen(true)}>Открыть</button>
 *     {open && <div ref={ref}>Модалка</div>}
 *   </>
 * );
 *
 * @example
 * // Временное отключение
 * const ref = useOutside<HTMLDivElement>(
 *   () => console.log('Clicked outside!'),
 *   skip = isLoading // пока грузим данные — клик игнорируется
 * );
 */
export const useOutsideClick = <
	T extends HTMLElement = HTMLElement
>(
		{
			callback,
			isSkip = false,
			exceptionId,
			eventType = OutsideTypeEvent.MOUSE_DOWN,
		}: UseOutsideProps
	): RefObject<T> => {
	const ref = useRef<T>(null);

	useEffect(() => {
		if (isSkip) return;

		const onClickOutside = (event: MouseEvent) => {
			if (!ref.current) return;

			const target = event.target as Node;

			if (ref.current.contains(target)) return;

			if (exceptionId && document.getElementById(exceptionId)?.contains(target)) return;

			callback();
		};

		window.addEventListener(eventType, onClickOutside);

		return () => {
			window.removeEventListener(eventType, onClickOutside);
		};
	}, [
		callback,
		isSkip,
		exceptionId,
		eventType
	]);

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
	return ref;
};
