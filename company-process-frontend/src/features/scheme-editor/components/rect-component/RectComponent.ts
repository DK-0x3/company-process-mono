import { BaseComponent } from '@features/scheme-editor/components/base-component/BaseComponent';
import { UtilsEditor } from '@features/scheme-editor/editor/UtilsEditor';
import { BaseComponentConfiguration } from '@features/scheme-editor/types/BaseComponentConfiguration';
import { DEFAULT_CELL_SIZE } from '@features/scheme-editor/types/constants';
import { FreezeRectConfigPermissions } from '@features/scheme-editor/types/FreezeRectConfigPermissions';
import { IDimension } from '@features/scheme-editor/types/IDimension';
import { IPosition } from '@features/scheme-editor/types/IPosition';
import { KonvaEventListener } from '@features/scheme-editor/types/KonvaEventListener';
import { WorldPoint } from '@features/scheme-editor/types/WorldPoint';
import Konva from 'konva';

export type ConfigRectListener<ConfigT extends RectComponentConfig = RectComponentConfig> = (
	config: ConfigT
) => void;

export interface RectComponentConfig extends BaseComponentConfiguration {
    fill: string;
    color: string;
	title: string;
	strokeColor: string;
	strokeWidth: number;
    cornerRadius?: number;
}

export class RectComponent<ConfigT extends RectComponentConfig = RectComponentConfig> extends BaseComponent<ConfigT> {
	protected node: Konva.Group;
	protected isEnableFocus: boolean;
	protected isEnableEditMode: boolean;

	private rect: Konva.Rect;
	protected text: Konva.Text;
	
	private configListeners: ConfigRectListener<ConfigT>[];
	private freezePermissions: FreezeRectConfigPermissions;
	
	constructor(config: ConfigT) {
		super(config);

		this.isEnableFocus = false;
		this.isEnableEditMode = false;
		this.configListeners = [];
		this.freezePermissions = {
			fill: false,
			color: false,
			strokeColor: false,
			strokeWidth: false,
			cornerRadius: false,
			id: false,
			title: false,
			width: false,
			height: false,
			wx: false,
			wy: false,
			type: true,
		};
		
		[
			this.node,
			this.rect,
			this.text,
		] = this.createKonvaNode();
	}
	
	public addConfigListener = (listener: ConfigRectListener<ConfigT>) => {
		this.configListeners.push(listener);
	};

	public callConfigListener = () => {
		this.configListeners.forEach((listener) => listener(this.configuration));
	};

	public getConfiguration = () => ({ ...this.configuration });

	public syncPersistedId = (id: number) => {
		this.configuration.id = id;
		this.node.id(id.toString());
	};

	public setConfiguration = (fn: (prev: ConfigT) => ConfigT) => {
		const prevConfig = { ...this.configuration };
		const newConfig = fn(this.configuration);
		
		const widthPx = newConfig.width * DEFAULT_CELL_SIZE;
		const heightPx = newConfig.height * DEFAULT_CELL_SIZE;
		const pixelPos = UtilsEditor.worldToPixel(newConfig);

		this.node.position(pixelPos);
		this.configuration.wx = newConfig.wx;
		this.configuration.wy = newConfig.wy;

		if (!this.freezePermissions.width && prevConfig.width !== newConfig.width) {
			this.rect.width(widthPx);
			this.text.width(widthPx);
			this.configuration.width = newConfig.width;
		}

		if (!this.freezePermissions.height && prevConfig.height !== newConfig.height) {
			this.rect.height(heightPx);
			this.text.height(heightPx);
			this.configuration.height = newConfig.height;
		}

		if (!this.freezePermissions.fill && prevConfig.fill !== newConfig.fill) {
			this.rect.fill(newConfig.fill);
			this.configuration.fill = newConfig.fill;
		}

		if (!this.freezePermissions.cornerRadius && prevConfig.cornerRadius !== newConfig.cornerRadius) {
			this.rect.cornerRadius(newConfig.cornerRadius);
			this.configuration.cornerRadius = newConfig.cornerRadius;
		}

		if (!this.freezePermissions.title && prevConfig.title !== newConfig.title) {
			this.text.text(newConfig.title);
			this.configuration.title = newConfig.title;
		}

		if (!this.freezePermissions.color && prevConfig.color !== newConfig.color) {
			this.text.fill(newConfig.color);
			this.configuration.color = newConfig.color;
		}

		if (!this.freezePermissions.strokeColor && prevConfig.strokeColor !== newConfig.strokeColor) {
			this.rect.stroke(newConfig.strokeColor);
			this.configuration.strokeColor = newConfig.strokeColor;
		}

		if (!this.freezePermissions.strokeWidth && prevConfig.strokeWidth !== newConfig.strokeWidth) {
			this.text.strokeWidth(newConfig.strokeWidth);
			this.configuration.strokeWidth = newConfig.strokeWidth;
		}

		this.callConfigListener();
	};

	public getKonvaNode = () => this.node;
	
	public getGlobalPosition = (): IPosition => ({ ...this.node.getPosition() });
	public getPosition = (): WorldPoint => ({ ...this.configuration });

	public getGlobalDimension = (): IDimension => ({
		width: this.configuration.width * DEFAULT_CELL_SIZE,
		height: this.configuration.height * DEFAULT_CELL_SIZE,
	});

	public getDimension = (): IDimension => ({ ...this.configuration });

	public setFreezePermissions = (
		fn: (permissions: FreezeRectConfigPermissions) => FreezeRectConfigPermissions,
	) => {
		const current = this.getFreezePermissions();
		const updated = fn(current);
		this.freezePermissions = { ...updated };
	};

	public getFreezePermissions = (): FreezeRectConfigPermissions => ({
		...this.freezePermissions,
	});
	
	private createKonvaNode(): [Konva.Group, Konva.Rect, Konva.Text] {
		const cfg = this.getConfiguration();

		const pixelPosition = UtilsEditor.worldToPixel({
			wx: cfg.wx,
			wy: cfg.wy,
		});

		const group = new Konva.Group({
			x: pixelPosition.x,
			y: pixelPosition.y,
			draggable: true,
			id: cfg.id.toString(),
		});

		const rect = new Konva.Rect({
			width: cfg.width * DEFAULT_CELL_SIZE,
			height: cfg.height * DEFAULT_CELL_SIZE,
			fill: cfg.fill,
			cornerRadius: cfg.cornerRadius ?? 6,
			shadowColor: 'rgba(0,0,0,0.2)',
			shadowBlur: 6,
			strokeWidth: cfg.strokeWidth,
			stroke: cfg.strokeColor,
		});

		const text = new Konva.Text({
			text: cfg.title,
			width: cfg.width * DEFAULT_CELL_SIZE,
			height: cfg.height * DEFAULT_CELL_SIZE,
			align: 'center',
			verticalAlign: 'middle',
			fontSize: 16,
			fill: cfg.color,
		});

		group.add(rect);
		group.add(text);

		return [
			group,
			rect,
			text
		];
	}

	public destroy = () => {
		this.node.destroy();
	};
	
	public enableFocus = () => {
		console.error('not implemented');
	};

	public disableFocus = () => {
		console.error('not implemented');
	};

	public isEnabledFocus = () => this.isEnableFocus;
	
	public addEnableFocusListener = (listener: VoidFunction) => {
		console.error('not implemented');
	};

	public addDisableFocusListener = (listener: VoidFunction) => {
		console.error('not implemented');
	};

	public enableEditMode = () => {
		console.error('not implemented');
	};

	public disableEditMode = () => {
		console.error('not implemented');
	};

	public isEnabledEditMode = () => this.isEnableEditMode;

	public addEnableEditModeListener = (listener: VoidFunction) => {
		console.error('not implemented');
	};

	public addDisableEditModeListener = (listener: VoidFunction) => {
		console.error('not implemented');
	};

	public enableDraggable = () => {
		console.error('not implemented');
	};

	public disableDraggable = () => {
		console.error('not implemented');
	};

	public addOnClickListener = (listener: KonvaEventListener) => {
		console.error('not implemented');
	};

	public freezeListenersExpectHover = (isFreeze: boolean) => {
		console.error('not implemented');
	};

	public addOnEnableHoverListener = (listener: VoidFunction) => {
		console.error('not implemented');
	};

	public addOnDisableHoverListener = (listener: VoidFunction) => {
		console.error('not implemented');
	};

	public addOnDoubleClickListener = (listener: KonvaEventListener) => {
		console.error('not implemented');
	};

	public addOnDragMoveListener = (listener: KonvaEventListener) => {
		console.error('not implemented');
	};

	public addOnDragEndListener = (listener: KonvaEventListener) => {
		console.error('not implemented');
	};

	public addOnDragStartListener = (listener: KonvaEventListener) => {
		console.error('not implemented');
	};

	public addOnMouseDownListener = (listener: KonvaEventListener) => {
		console.error('not implemented');
	};

	public addOnMouseUpListener = (listener: KonvaEventListener) => {
		console.error('not implemented');
	};

	public addOnContextMenuListener = (listener: KonvaEventListener) => {
		console.error('not implemented');
	};
}
