import { UtilsEditor } from '@features/scheme-editor/editor/UtilsEditor';
import { WorldPoint } from '@features/scheme-editor/types/WorldPoint';
import Konva from 'konva';

import { GridRenderer } from './GridRenderer';

interface CameraOptions {
	cols: number;
	rows: number;
	cellSize: number;
	grid: GridRenderer;
}

export class CameraController {
	private stage: Konva.Stage;
	private opts: CameraOptions;

	private isPanning = false;
	private isSpacePressed = false;
	private lastPos = {
		x: 0,
		y: 0,
	};

	private minScale = 0.2;
	private maxScale = 3.0;
	private scaleBy = 1.07;

	constructor(stage: Konva.Stage, opts: CameraOptions) {
		this.stage = stage;
		this.opts = opts;

		this.enablePan();
		this.enableZoom();

		this.centerToWorld();
	}

	public centerToWorld(p: WorldPoint = {
		wx: 0,
		wy: 0 
	}, scale = 1) {
		const pixel = UtilsEditor.worldToPixel(p);

		const viewportWidth = this.stage.width();
		const viewportHeight = this.stage.height();

		this.stage.scale({
			x: scale,
			y: scale 
		});
		this.stage.position({
			x: viewportWidth / 2 - pixel.x * scale,
			y: viewportHeight / 2 - pixel.y * scale,
		});

		this.stage.batchDraw();
	}

	public centerToGrid(scale = this.stage.scaleX()) {
		const gridWidth = this.opts.cols * this.opts.cellSize;
		const gridHeight = this.opts.rows * this.opts.cellSize;

		const viewportWidth = this.stage.width();
		const viewportHeight = this.stage.height();

		const x = (viewportWidth - gridWidth * scale) / 2;
		const y = (viewportHeight - gridHeight * scale) / 2;

		this.stage.scale({
			x: scale,
			y: scale 
		});
		this.stage.position({
			x,
			y 
		});
		this.stage.batchDraw();
	}

	private enablePan() {
		// 1. Слушаем нажатие клавиш
		window.addEventListener('keydown', (e) => {
			if (e.code === 'Space') {
				this.isSpacePressed = true;
				// Опционально: меняем курсор на grab, когда пробел просто зажат
				if (!this.isPanning) document.body.style.cursor = 'grab';
			}
		});

		window.addEventListener('keyup', (e) => {
			if (e.code === 'Space') {
				this.isSpacePressed = false;
				if (!this.isPanning) document.body.style.cursor = 'default';
			}
		});

		this.stage.on('mousedown', (e) => {
			// 2. Условие: Средняя кнопка ИЛИ (Левая кнопка + Пробел)
			const isMiddleButton = e.evt.button === 1;
			const isLeftButtonWithSpace = e.evt.button === 0 && this.isSpacePressed;

			if (!isMiddleButton && !isLeftButtonWithSpace) return;

			this.isPanning = true;
			this.lastPos = {
				x: e.evt.clientX,
				y: e.evt.clientY
			};
			document.body.style.cursor = 'grabbing';
		});

		this.stage.on('mouseup mouseleave', () => {
			this.isPanning = false;
			// Возвращаем курсор в зависимости от состояния пробела
			document.body.style.cursor = this.isSpacePressed ? 'grab' : 'default';
		});

		this.stage.on('mousemove', (e) => {
			if (!this.isPanning) return;

			// Отменяем стандартное поведение (например, выделение текста при перемещении)
			e.evt.preventDefault();

			const pos = {
				x: e.evt.clientX,
				y: e.evt.clientY
			};
			const dx = pos.x - this.lastPos.x;
			const dy = pos.y - this.lastPos.y;

			const { newX, newY } = this.clampPosition(
				this.stage.x() + dx,
				this.stage.y() + dy,
				this.stage.scaleX()
			);

			this.stage.position({ x: newX, y: newY });

			this.lastPos = pos;
			this.stage.batchDraw();
		});
	}

	private enableZoom() {
		this.stage.on('wheel', (e) => {
			e.evt.preventDefault();

			const oldScale = this.stage.scaleX();
			const pointer = this.stage.getPointerPosition();
			if (!pointer) return;

			const mousePointTo = {
				x: (pointer.x - this.stage.x()) / oldScale,
				y: (pointer.y - this.stage.y()) / oldScale,
			};

			const direction = e.evt.deltaY > 0 ? -1 : 1;
			const newScale = direction > 0
				? oldScale * this.scaleBy
				: oldScale / this.scaleBy;

			const finalScale = Math.min(this.maxScale, Math.max(this.minScale, newScale));
			this.stage.scale({
				x: finalScale,
				y: finalScale 
			});

			let x = pointer.x - mousePointTo.x * finalScale;
			let y = pointer.y - mousePointTo.y * finalScale;

			const clamped = this.clampPosition(x, y, finalScale);

			this.stage.position({
				x: clamped.newX,
				y: clamped.newY 
			});
			this.stage.batchDraw();
		});
	}

	private clampPosition(x: number, y: number, scale: number) {
		const gridWidth = this.opts.cols * this.opts.cellSize * scale;
		const gridHeight = this.opts.rows * this.opts.cellSize * scale;

		const viewportWidth = this.stage.width();
		const viewportHeight = this.stage.height();

		const minX = viewportWidth - gridWidth;
		const minY = viewportHeight - gridHeight;

		return {
			newX: Math.min(0, Math.max(minX, x)),
			newY: Math.min(0, Math.max(minY, y)),
		};
	}
}
