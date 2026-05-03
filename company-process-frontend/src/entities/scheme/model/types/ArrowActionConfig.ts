import { DotSide } from '@entities/scheme/model/types/DotSide';
import { SchemeComponentType } from '@entities/scheme/model/types/SchemeComponentType';

export interface ArrowActionConfig {
    fromDot: DotActionConfig;
    toDot: DotActionConfig;
}

export interface DotActionConfig {
    side: DotSide;
    offset: number;
    parentComponentId: number;
    parentComponentType: SchemeComponentType;
}