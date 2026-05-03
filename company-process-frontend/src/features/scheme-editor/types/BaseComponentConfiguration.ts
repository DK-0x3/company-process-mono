import { SchemeComponentType } from '@entities/scheme/model/types/SchemeComponentType';
import { WorldPoint } from '@features/scheme-editor/types/WorldPoint';

export interface BaseComponentConfiguration extends WorldPoint {
    id: number;
    width: number;
    height: number;
    type: SchemeComponentType;
}