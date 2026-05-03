import { BaseComponentConfiguration } from '@features/scheme-editor/types/BaseComponentConfiguration';
import { IDimension } from '@features/scheme-editor/types/IDimension';
import { IPosition } from '@features/scheme-editor/types/IPosition';
import { KonvaEventListener } from '@features/scheme-editor/types/KonvaEventListener';
import { WorldPoint } from '@features/scheme-editor/types/WorldPoint';
import Konva from 'konva';

export interface IBaseComponent {
    getConfiguration: () => BaseComponentConfiguration;

    // eslint-disable-next-line
    setConfiguration: (fn: (prev: any) => any) => void;

    getKonvaNode: () => Konva.Group;
    
    getGlobalPosition: () => IPosition;

    getPosition: () => WorldPoint;

    getGlobalDimension: () => IDimension;

    getDimension: () => IDimension;

    addConfigListener: (listener: (config: BaseComponentConfiguration) => void) => void;

    disableFocus: VoidFunction;
    enableFocus: VoidFunction;
    isEnabledFocus: () => boolean;
    addEnableFocusListener: (listener: VoidFunction) => void;
    addDisableFocusListener: (listener: VoidFunction) => void;

    disableEditMode: VoidFunction;
    enableEditMode: VoidFunction;
    isEnabledEditMode: () => boolean;
    addEnableEditModeListener: (listener: VoidFunction) => void;
    addDisableEditModeListener: (listener: VoidFunction) => void;

    enableDraggable: VoidFunction;

    disableDraggable: VoidFunction;

    /**
     * Замораживает всех подписчиков событий кроме наведения
     */
    freezeListenersExpectHover: (isFreeze: boolean) => void;

    addOnEnableHoverListener: (listener: VoidFunction) => void;
    addOnDisableHoverListener: (listener: VoidFunction) => void;

    addOnClickListener: (listener: KonvaEventListener) => void;

    addOnDoubleClickListener: (listener: KonvaEventListener) => void;

    addOnDragMoveListener: (listener: KonvaEventListener) => void;

    addOnDragEndListener: (listener: KonvaEventListener) => void;

    addOnDragStartListener: (listener: KonvaEventListener) => void;

    addOnMouseDownListener: (listener: KonvaEventListener) => void;

    addOnMouseUpListener: (listener: KonvaEventListener) => void;

    addOnContextMenuListener: (listener: KonvaEventListener) => void;

    destroy: VoidFunction;
}
