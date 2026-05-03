import { ContextMenu } from '@shared/ui/context-menu/ContextMenu';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { RefObject } from 'react';

interface ContextMenuArrowEditorProps {
	isOpen: boolean;
	onClose: VoidFunction;
	ref: RefObject<HTMLDivElement | null>;
	onClickDelete: VoidFunction;
}

export const ContextMenuArrowEditor = ({
	isOpen,
	onClose,
	ref,
	onClickDelete,
}: ContextMenuArrowEditorProps) => {

	const onDelete = () => {
		onClickDelete();
	};
	
	return (
		<ContextMenu
			isOpen={isOpen}
			onClose={onClose}
			anchorRef={ref as RefObject<HTMLElement>}
			placement="bottom-start"
			items={[
				{
					label: 'Удалить',
					onClick: onDelete,
					icon: <SmartIcon iconName={'trash'}/>,
				},
			]}
		/>
	);
};