import { DotSide } from '@entities/scheme/model/types/DotSide';
import { UtilsEditor } from '@features/scheme-editor/editor/UtilsEditor';
import { DEFAULT_CELL_SIZE } from '@features/scheme-editor/types/constants';
import { IBaseComponent } from '@features/scheme-editor/types/IBaseComponent';
import { WorldPoint } from '@features/scheme-editor/types/WorldPoint';
import Konva from 'konva';

export interface DotConfig {
	id: string;
	side: DotSide;
	offset: number;
}

export type { DotSide };

export class Dot {
	private parent: IBaseComponent;
	private cfg: DotConfig;
	private isConnect: boolean;
	
	private postUpdatePositionListeners: VoidFunction[];
	private onClickListeners: ((dot: Dot) => void)[];

	private node: Konva.Circle;

	constructor(parent: IBaseComponent, cfg: DotConfig) {
		this.parent = parent;
		this.cfg = cfg;
		this.isConnect = false;
		this.postUpdatePositionListeners = [];
		this.onClickListeners = [];

		this.node = new Konva.Circle({
			radius: 4,
			fill: '#ffffff',
			stroke: '#000000',
			strokeWidth: 1,
			opacity: 0.9,
			listening: true,
		});

		this.node.on('mouseenter', this.onEnableHover);
		this.node.on('mouseleave', this.onDisableHover);
		this.node.on('click', this.onClick);
	}

	public getParent = () => this.parent;

	public destroy = () => {
		this.node.off();
		this.node.destroy();
	};

	public addOnClickListeners = (...listeners: ((dot: Dot) => void)[])=> {
		const result = listeners.filter((l) => !this.onClickListeners.includes(l));

		this.onClickListeners.push(...result);
	};
	
	public enableConnect = () => {
		this.isConnect = true;
	};

	public disableConnect = () => {
		this.isConnect = false;
	};
	
	public getSide = () => this.cfg.side;

	public getOffset = () => {
		return this.cfg.offset;
	};
	
	public setOffset = (offset: number) => {
		this.cfg.offset = offset;
	};

	public setId = (id: string) => {
		this.cfg.id = id;
	};

	public isEnableConnect = () => this.isConnect;
	
	public enable = () => {
		this.node.visible(true);
	};

	public disable = () => {
		this.node.visible(false);
	};

	public getKonvaNode = () => {
		return this.node;
	};

	public getParentWorldPoint = () => this.parent.getPosition();
	
	public getWorldPoint = (): WorldPoint => {
		const parentWorldPoint = this.parent.getPosition();
		const pixelPoint = this.node.getPosition();
		const gridPoint = UtilsEditor.pixelToGrid(pixelPoint);
		
		return {
			wx: parentWorldPoint.wx + gridPoint.gx,
			wy: parentWorldPoint.wy + gridPoint.gy,
		};
	};
	
	public addPostUpdatePosition = (listener: VoidFunction) => {
		this.postUpdatePositionListeners.push(listener);
	};

	/** позиция точки вычисляется здесь */
	public updatePosition = () => {
		const cfg = this.parent.getConfiguration();

		const w = cfg.width * DEFAULT_CELL_SIZE;
		const h = cfg.height * DEFAULT_CELL_SIZE;

		let x = 0, y = 0;

		switch (this.cfg.side) {
		case 'top':
			x = this.cfg.offset * DEFAULT_CELL_SIZE;
			y = 0;
			break;
		case 'bottom':
			x = this.cfg.offset * DEFAULT_CELL_SIZE;
			y = h;
			break;
		case 'left':
			x = 0;
			y = this.cfg.offset * DEFAULT_CELL_SIZE;
			break;
		case 'right':
			x = w;
			y = this.cfg.offset * DEFAULT_CELL_SIZE;
			break;
		}

		this.node.position({
			x,
			y 
		});

		this.postUpdatePositionListeners.forEach((l) => l());
	};

	public getId = () => {
		return this.cfg.id;
	};

	private onClick = () => {
		this.onClickListeners.forEach((l) => l(this));
	};
	
	private onEnableHover = () => {
		document.body.style.cursor = 'alias';
		this.node.fill('#4a90e2');
		this.node.stroke('#4a90e2');
		this.node.opacity(1);
		this.node.strokeWidth(6);
		this.node.getLayer()?.batchDraw();
	};

	private onDisableHover = () => {
		document.body.style.cursor = 'default';
		this.node.fill('#ffffff');
		this.node.stroke('#000000');
		this.node.opacity(0.9);
		this.node.strokeWidth(1);
		this.node.getLayer()?.batchDraw();
	};
}
