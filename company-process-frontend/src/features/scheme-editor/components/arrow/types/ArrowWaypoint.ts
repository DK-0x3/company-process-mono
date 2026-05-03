import { WorldPoint } from '@features/scheme-editor/types/WorldPoint';
import Konva from 'konva';

export interface ArrowWaypoint {
    id: string;
    point: WorldPoint;
    node: Konva.Circle;
}
