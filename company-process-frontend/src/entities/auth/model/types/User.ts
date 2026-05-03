export interface User {
    id: number;
    login: string;
    email: string;
    actorType: 'OWNER' | 'EMPLOYEE';
    ownerUserId: number;
    employeeId: number | null;
    fullName?: string;
    permissions?: {
        canViewProcesses: boolean;
        canEditProcesses: boolean;
        canViewTasks: boolean;
        canEditTasks: boolean;
        canViewPositions: boolean;
        canEditPositions: boolean;
        canViewDataObjects: boolean;
        canEditDataObjects: boolean;
        canViewMaterials: boolean;
        canEditMaterials: boolean;
        canViewTests: boolean;
        canEditTests: boolean;
    };
}
