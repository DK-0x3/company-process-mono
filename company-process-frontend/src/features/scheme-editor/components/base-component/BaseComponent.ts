import { BaseComponentConfiguration } from '@features/scheme-editor/types/BaseComponentConfiguration';
import { IBaseComponent } from '@features/scheme-editor/types/IBaseComponent';
import { IDimension } from '@features/scheme-editor/types/IDimension';
import { IPosition } from '@features/scheme-editor/types/IPosition';
import { KonvaEventListener } from '@features/scheme-editor/types/KonvaEventListener';
import { WorldPoint } from '@features/scheme-editor/types/WorldPoint';
import Konva from 'konva';

export abstract class BaseComponent<ConfigT extends BaseComponentConfiguration> implements IBaseComponent {
	protected configuration: ConfigT;

	constructor(config: ConfigT) {
		this.configuration = config;
	}

	public abstract enableDraggable: VoidFunction;

    public abstract disableDraggable: VoidFunction;

    public abstract addOnClickListener: (listener: KonvaEventListener) => void;

    public abstract freezeListenersExpectHover: (isFreeze: boolean) => void;

    public abstract addOnEnableHoverListener: (listener: VoidFunction) => void;
    public abstract addOnDisableHoverListener: (listener: VoidFunction) => void;

    public abstract addOnDoubleClickListener: (listener: KonvaEventListener) => void;

    public abstract addOnDragMoveListener: (listener: KonvaEventListener) => void;

    public abstract addOnDragEndListener: (listener: KonvaEventListener) => void;

    public abstract addOnDragStartListener: (listener: KonvaEventListener) => void;

    public abstract addOnMouseDownListener: (listener: KonvaEventListener) => void;

    public abstract addOnMouseUpListener: (listener: KonvaEventListener) => void;

    public abstract addOnContextMenuListener: (listener: KonvaEventListener) => void;

	public abstract addConfigListener: (listener: (config: ConfigT) => void) => void;

	public abstract disableFocus: () => void;
	public abstract enableFocus: () => void;
	public abstract isEnabledFocus: () => boolean;
	public abstract addEnableFocusListener: (listener: VoidFunction) => void;
	public abstract addDisableFocusListener: (listener: VoidFunction) => void;

	public abstract disableEditMode: () => void;
	public abstract enableEditMode: () => void;
	public abstract isEnabledEditMode: () => boolean;
	public abstract addEnableEditModeListener: (listener: VoidFunction) => void;
	public abstract addDisableEditModeListener: (listener: VoidFunction) => void;

	public abstract getConfiguration: () => ConfigT;

	public abstract setConfiguration: (fn: (prev: ConfigT) => ConfigT) => void;

	public abstract getKonvaNode: () => Konva.Group;
	
	public abstract getGlobalPosition: () => IPosition;

	public abstract getPosition: () => WorldPoint;

	public abstract getGlobalDimension: () => IDimension;

	public abstract getDimension: () => IDimension;

	public abstract destroy: VoidFunction;
}
