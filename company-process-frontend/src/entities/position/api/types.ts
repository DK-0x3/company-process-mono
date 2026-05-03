import { Position } from '@entities/position/model/types/Position';

export interface CreatePositionRequest {
    name: string;
}
export type CreatePositionResponse = Position;

export type GetAllPositionsResponse = Position[];

export type GetByIdPositionResponse = Position;

export interface GetByIdPositionRequest {
    id: number;
}

export interface UpdatePositionRequest {
    id: number;
    name?: string;
}

export type UpdatePositionResponse = Position;

export interface DeletePositionRequest {
    id: number;
}
