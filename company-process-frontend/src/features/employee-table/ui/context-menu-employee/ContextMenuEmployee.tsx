import { employeeActions } from '@entities/employee/model/slice';
import { Employee } from '@entities/employee/model/types/Employee';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import { ContextMenu } from '@shared/ui/context-menu/ContextMenu';
import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { RefObject } from 'react';

interface ContextMenuProcessProps {
	employee: Employee;
	isOpen: boolean;
	onClose: VoidFunction;
	ref: RefObject<HTMLDivElement | null>;
}

export const ContextMenuEmployee = ({
	employee,
	isOpen,
	onClose,
	ref,
}: ContextMenuProcessProps) => {
	const dispatch = useAppDispatch();

	const onUpdate = () => {
		if (!employee) return;

		dispatch(employeeActions.setUpdateData({
			id: employee.id,
			fullName: employee.fullName,
			email: employee.email,
			phone: employee.phone,
			address: employee.address,
			positionId: employee.position?.id,
			birthDate: employee.birthDate,
			hireDate: employee.hireDate,
			accountLogin: employee.userAccount?.login ?? '',
			accountPassword: employee.userAccount?.visiblePassword ?? '',
			permissions: {
				canViewProcesses: employee.canViewProcesses,
				canEditProcesses: employee.canEditProcesses,
				canViewTasks: employee.canViewTasks,
				canEditTasks: employee.canEditTasks,
				canViewPositions: employee.canViewPositions,
				canEditPositions: employee.canEditPositions,
				canViewDataObjects: employee.canViewDataObjects,
				canEditDataObjects: employee.canEditDataObjects,
				canViewMaterials: employee.canViewMaterials,
				canEditMaterials: employee.canEditMaterials,
				canViewTests: employee.canViewTests,
				canEditTests: employee.canEditTests,
			},
		}));

		dispatch(employeeActions.setIsActiveUpdateModal(true));
	};
	
	const onDelete = () => {
		if (!employee) return;

		dispatch(employeeActions.setDeleteId(employee.id));
		dispatch(employeeActions.setIsActiveDeleteModal(true));
	};
	
	return (
		<ContextMenu
			isOpen={isOpen}
			onClose={onClose}
			anchorRef={ref as RefObject<HTMLElement>}
			placement="bottom-start"
			items={[
				{
					label: 'Редактировать',
					onClick: onUpdate,
					icon: <SmartIcon iconName={'edit'}/>,
				},
				{
					label: 'Удалить',
					onClick: onDelete,
					icon: <SmartIcon iconName={'trash'}/>,
				},
			]}
		/>
	);
};
