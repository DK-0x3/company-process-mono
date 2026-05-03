import { UtilsEditor } from '@features/scheme-editor/editor/UtilsEditor';
import CSSCursor from '@features/scheme-editor/types/CSSCursor';
import { IBaseComponent } from '@features/scheme-editor/types/IBaseComponent';
import Konva from 'konva';

interface ResizeOptions {
	cellSize: number;
	minWidth?: number; // в клетках
	minHeight?: number; // в клетках
}

// Все в глобальном измерении px
type DragState = {
	startX: number;
	startY: number;
	startW: number;
	startH: number;
	handleName: string;

	currentX: number;
	currentY: number;
	currentW: number;
	currentH: number;
};

export class ResizeController {
	private stage: Konva.Stage;
	private layer: Konva.Layer;
	private opts: Required<ResizeOptions>;

	private activeComponent: IBaseComponent | null = null;

	private ghost: Konva.Rect;

	private handles: Record<string, Konva.Rect> = {};
	private readonly handleSize = 10;

	private dragState: DragState | null = null;

	constructor(stage: Konva.Stage, opts: ResizeOptions) {
		this.stage = stage;
		this.opts = {
			cellSize: opts.cellSize,
			minWidth: opts.minWidth ?? 1,
			minHeight: opts.minHeight ?? 1,
		};

		this.layer = new Konva.Layer({ listening: true });
		this.stage.add(this.layer);

		this.ghost = new Konva.Rect({
			fill: 'rgba(0, 153, 255, 0.1)',
			stroke: '#0099ff',
			strokeWidth: 2,
			dash: [5, 5],
			visible: false,
			listening: false,
		});
		this.layer.add(this.ghost);

		this.createHandles();
	}

	/** Показать ручки вокруг компонента */
	public select = (component: IBaseComponent) => {
		this.activeComponent = component;

		const { x: startX, y: startY } = this.activeComponent.getGlobalPosition();
		const { width: startW, height: startH } = this.activeComponent.getGlobalDimension();
		this.ghost.x(startX);
		this.ghost.y(startY);
		this.ghost.width(startW);
		this.ghost.height(startH);

		this.updateHandlesPositions();
		this.showHandles();
	};

	/** Спрятать ручки */
	public clearSelection = () => {
		this.activeComponent = null;
		
		Object.values(this.handles).forEach((h) => h.visible(false));
		this.layer.batchDraw();
	};

	public updateHandlesAfterMove = () => {
		if (this.activeComponent) {
			this.updateHandlesPositions();
		}
	};

	private createHandles = () => {
		const names = [
			'nw',
			'n',
			'ne',
			'w',
			'e',
			'sw',
			's',
			'se'
		] as const;

		names.forEach((name) => {
			let handle: Konva.Rect | null = null;

			if (name === 'nw' || name === 'ne' || name === 'se' || name === 'sw') {
				handle = new Konva.Rect({
					width: this.handleSize,
					height: this.handleSize,
					fill: '#ffffff',
					stroke: '#0099ff',
					strokeWidth: 1,
					visible: false,
					draggable: true,
					cornerRadius: 20,
					name,
				});
			} else if (name === 'w' || name === 'e') {
				handle = new Konva.Rect({
					width: this.handleSize / 2,
					height: this.handleSize * 2,
					fill: '#ffffff',
					stroke: '#0099ff',
					strokeWidth: 1,
					visible: false,
					draggable: true,
					cornerRadius: 20,
					name,
				});
			} else if (name === 'n' || name ==='s') {
				handle = new Konva.Rect({
					width: this.handleSize * 2,
					height: this.handleSize / 2,
					fill: '#ffffff',
					stroke: '#0099ff',
					strokeWidth: 1,
					visible: false,
					draggable: true,
					cornerRadius: 20,
					name,
				});
			}
			
			if (!handle) {
				throw new Error('handle undefined!');
			}

			handle.on('dragstart', () => this.onHandleDragStart(handle));
			handle.on('dragmove', () => this.onHandleDragMove(handle));
			handle.on('dragend', () => this.onHandleDragEnd(handle));
			handle.on('mouseenter', () => {
				switch (name) {

				case 'nw': {
					document.body.style.cursor = CSSCursor.LEFT_TOP;
					break;
				}
				case 'n': {
					document.body.style.cursor = CSSCursor.TOP;
					break;
				}
				case 'ne': {
					document.body.style.cursor = CSSCursor.RIGHT_TOP;
					break;
				}
				case 'e': {
					document.body.style.cursor = CSSCursor.RIGHT;
					break;
				}
				case 'se': {
					document.body.style.cursor = CSSCursor.RIGHT_BOTTOM;
					break;
				}
				case 's': {
					document.body.style.cursor = CSSCursor.BOTTOM;
					break;
				}
				case 'sw': {
					document.body.style.cursor = CSSCursor.LEFT_BOTTOM;
					break;
				}
				case 'w': {
					document.body.style.cursor = CSSCursor.LEFT;
					break;
				}

				}
				handle.fill('#0099ff');
			});

			handle.on('mouseleave', () => {
				document.body.style.cursor = CSSCursor.DEFAULT;
				handle.fill('#ffffff');
			});

			this.layer.add(handle);
			this.handles[name] = handle;
		});
	};

	private onHandleDragStart(handle: Konva.Rect) {
		if (!this.activeComponent) return;
		
		const { x: startX, y: startY } = this.activeComponent.getGlobalPosition();
		
		const { width: startW, height: startH } = this.activeComponent.getGlobalDimension();

		this.dragState = {
			startX,
			startY,
			startW,
			startH,
			handleName: handle.name(),

			currentX: startX,
			currentY: startY,
			currentW: startW,
			currentH: startH,
		};

		this.ghost.x(startX);
		this.ghost.y(startY);
		this.ghost.width(startW);
		this.ghost.height(startH);
		this.ghost.visible(true);
	}

	private onHandleDragMove(handle: Konva.Rect) {
		if (!this.activeComponent || !this.dragState) return;

		const {
			cellSize, minWidth, minHeight
		} = this.opts;

		const {
			startX, startY, startW, startH, handleName
		} = this.dragState;

		// центр ручки (в координатах stage)
		const hPixelX = handle.x() + this.handleSize / 2;
		const hPixelY = handle.y() + this.handleSize / 2;

		let pixelX = startX;
		let pixelY = startY;
		let pixelWidth = startW;
		let pixelHeight = startH;

		// Лево/право
		if (handleName.includes('w')) {
			const right = startX + startW;
			pixelX = Math.min(hPixelX, right - minWidth * cellSize);
			pixelWidth = right - pixelX;
		} else if (handleName.includes('e')) {
			const left = startX;
			pixelWidth = Math.max(hPixelX - left, minWidth * cellSize);
			pixelX = left;
		}

		// Верх/низ
		if (handleName.includes('n')) {
			const bottom = startY + startH;
			pixelY = Math.min(hPixelY, bottom - minHeight * cellSize);
			pixelHeight = bottom - pixelY;
		} else if (handleName.includes('s')) {
			const top = startY;
			pixelHeight = Math.max(hPixelY - top, minHeight * cellSize);
			pixelY = top;
		}

		this.ghost.position({
			x: Math.round(pixelX / cellSize) * cellSize,
			y: Math.round(pixelY / cellSize) * cellSize,
		});
		this.ghost.width(Math.round(pixelWidth / cellSize) * cellSize);
		this.ghost.height(Math.round(pixelHeight / cellSize) * cellSize);

		// Обновляем позиции ручек
		this.updateHandlesPositions();
	}

	private onHandleDragEnd(handle: Konva.Rect) {
		if (!this.activeComponent || !this.dragState) return;

		const {
			cellSize, minWidth, minHeight
		} = this.opts;

		const {
			startX, startY, startW, startH, handleName
		} = this.dragState;

		// центр ручки (в координатах stage)
		const hPixelX = handle.x() + this.handleSize / 2;
		const hPixelY = handle.y() + this.handleSize / 2;

		let pixelX = startX;
		let pixelY = startY;
		let pixelWidth = startW;
		let pixelHeight = startH;

		// Лево/право
		if (handleName.includes('w')) {
			const right = startX + startW;
			pixelX = Math.min(hPixelX, right - minWidth * cellSize);
			pixelWidth = right - pixelX;
		} else if (handleName.includes('e')) {
			const left = startX;
			pixelWidth = Math.max(hPixelX - left, minWidth * cellSize);
			pixelX = left;
		}

		// Верх/низ
		if (handleName.includes('n')) {
			const bottom = startY + startH;
			pixelY = Math.min(hPixelY, bottom - minHeight * cellSize);
			pixelHeight = bottom - pixelY;
		} else if (handleName.includes('s')) {
			const top = startY;
			pixelHeight = Math.max(hPixelY - top, minHeight * cellSize);
			pixelY = top;
		}

		// Переводим в координаты сетки (клетки)
		const newWidthCells = Math.max(minWidth, Math.round(pixelWidth / cellSize));
		const newHeightCells = Math.max(minHeight, Math.round(pixelHeight / cellSize));

		const newPos = UtilsEditor.pixelToWorld({
			x: pixelX,
			y: pixelY,
		});

		// Обновляем конфиг компонента
		this.activeComponent.setConfiguration((prev) => ({
			...prev,
			wx: newPos.wx,
			wy: newPos.wy,
			width: newWidthCells,
			height: newHeightCells,
		}));

		// Обновляем позиции ручек
		this.updateHandlesPositions();

		this.dragState = null;
		this.ghost.visible(false);
	}

	private updateHandlesPositions() {
		if (!this.activeComponent) return;

		// const cfg = this.activeComponent.getConfiguration();
		const w = this.ghost.width();
		const h = this.ghost.height();
		const x = this.ghost.x();
		const y = this.ghost.y();

		// const cell = this.opts.cellSize;

		// const { x,y } = this.activeComponent.getGlobalPosition();
		// const w = cfg.width * cell;
		// const h = cfg.height * cell;

		const positions: Record<string, [number, number]> = {
			nw: [x, y],
			n: [x + w / 2 - this.handleSize / 2, y + this.handleSize / 4],
			ne: [x + w, y],
			w: [x + this.handleSize / 4, y + h / 2 - this.handleSize / 2],
			e: [x + w + this.handleSize / 4, y + h / 2 - this.handleSize / 2],
			sw: [x, y + h],
			s: [x + w / 2 - this.handleSize / 2, y + h + this.handleSize / 4],
			se: [x + w, y + h],
		};

		Object.entries(this.handles).forEach(([name, handle]) => {
			const [cx, cy] = positions[name];
			handle.position({
				x: cx - this.handleSize / 2,
				y: cy - this.handleSize / 2,
			});
		});

		this.layer.batchDraw();
	}

	private showHandles() {
		Object.values(this.handles).forEach((h) => h.visible(true));
		this.layer.batchDraw();
	}
}
