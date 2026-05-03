import { CreatePositionRequest, UpdatePositionRequest } from '@entities/position/api/types';
import { Position } from '@entities/position/model/types/Position';

export interface PositionState {
    isActiveCreateModal: boolean;
    isActiveUpdateModal: boolean;
    isActiveViewModal: boolean;
    isActiveDeleteModal: boolean;
    
    createData: CreatePositionRequest;
    updateData: UpdatePositionRequest;
    viewData: Position | null;
    deleteData: Position | null;
}