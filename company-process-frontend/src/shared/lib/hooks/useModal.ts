import { useOutsideClick } from '@shared/lib/hooks/useOutsideClick';
import { useEffect, useRef } from 'react';

let modalStack: HTMLElement[] = [];

export const useModal = (
	onActive: (value: boolean) => void,
	isActive: boolean,
	modalInModalActive?: boolean,
) => {
	const modalRef = useRef<HTMLDivElement>(null);
	const modalContentRef = useOutsideClick<HTMLDivElement>({
		callback: () => {
			const topModal = modalStack[modalStack.length - 1];
			if (topModal === modalRef.current) {
				onActive(false);
				modalStack.pop();
			}
		},
		isSkip: modalInModalActive,
	});

	useEffect(() => {
		if (isActive && modalRef.current) {
			modalStack.push(modalRef.current);
		}
		return () => {
			modalStack = modalStack.filter((el) => el !== modalRef.current);
		};
	}, [isActive]);

	return {
		modalRef,
		modalContentRef 
	};
};

