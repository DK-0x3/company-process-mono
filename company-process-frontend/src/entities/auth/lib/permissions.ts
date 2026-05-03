import { User } from '../model/types/User';

type EntityName =
	| 'processes'
	| 'tasks'
	| 'positions'
	| 'dataObjects'
	| 'materials'
	| 'tests';

const permissionMap: Record<EntityName, { view: keyof NonNullable<User['permissions']>; edit: keyof NonNullable<User['permissions']> }> = {
	processes: { view: 'canViewProcesses', edit: 'canEditProcesses' },
	tasks: { view: 'canViewTasks', edit: 'canEditTasks' },
	positions: { view: 'canViewPositions', edit: 'canEditPositions' },
	dataObjects: { view: 'canViewDataObjects', edit: 'canEditDataObjects' },
	materials: { view: 'canViewMaterials', edit: 'canEditMaterials' },
	tests: { view: 'canViewTests', edit: 'canEditTests' },
};

export const canViewEntity = (user: User | null, entity: EntityName): boolean => {
	if (!user) return false;
	if (user.actorType === 'OWNER') return true;
	if (!user.permissions) return true;

	const keys = permissionMap[entity];
	return Boolean(user.permissions[keys.view] || user.permissions[keys.edit]);
};

export const canEditEntity = (user: User | null, entity: EntityName): boolean => {
	if (!user) return false;
	if (user.actorType === 'OWNER') return true;
	if (!user.permissions) return false;

	const keys = permissionMap[entity];
	return Boolean(user.permissions[keys.edit]);
};
