import { useModal } from '@shared/lib/hooks/useModal';
import cx from 'classnames';
import React from 'react';
import ReactDOM from 'react-dom';
import { CSSTransition } from 'react-transition-group';

import CloseModalButton from './close-modal-button/CloseModalButton';
import styles from './Modal.module.scss';

interface ModalProps {
	isActive: boolean,
	onClose: (active: boolean) => void,
	children: React.ReactNode,
	contentClassName?: string,
	modalInModalActive?: boolean
}

export const portal = document.getElementById('portal');

/** Компонент - модальное окно */
export const Modal = ({
	isActive,
	onClose,
	contentClassName,
	children,
	modalInModalActive,
}: ModalProps) => {
	const {
		modalRef,
		modalContentRef,
	} = useModal(onClose, isActive, modalInModalActive);

	const onCloseModal = () => onClose(false);

	return (
		<>
			{
				ReactDOM.createPortal(
					<CSSTransition
						in={isActive}
						timeout={500}
						nodeRef={modalRef}
						classNames={{
							enter: styles.modalEnter,
							enterActive: styles.modalEnterActive,
							exit: styles.modalExit,
							exitActive: styles.modalExitActive,
						}}
						unmountOnExit
					>
						<div
							className={styles.modal}
							ref={modalRef}
							role="presentation"
						>
							<div
								className={cx(styles.contentWrapper, contentClassName)}
								ref={modalContentRef}
								onMouseDown={(e) => {
									if (modalInModalActive) return;
									e.stopPropagation();
									console.log('click in modal content');
								}}
							>
								<CloseModalButton onClose={onCloseModal} />
								{children}
							</div>
						</div>
					</CSSTransition>,
					portal as Element,
				)
			}
		</>
	);
};
