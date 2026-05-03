import { UtilsEditor } from '@features/scheme-editor/editor/UtilsEditor';
import { IBaseComponent } from '@features/scheme-editor/types/IBaseComponent';
import Konva from 'konva';

interface SnapOptions {
	cellSize: number;
	cols: number;
	rows: number;
}

export class SnapController {
	private stage: Konva.Stage;
	private cellSize: number;
	private cols: number;
	private rows: number;
	private maxX: number;
	private maxY: number;

	private previewLayer: Konva.Layer;
	private previewRect: Konva.Rect;
	private originShadow: Konva.Rect;

	constructor(stage: Konva.Stage, opts: SnapOptions) {
		this.stage = stage;
		this.cellSize = opts.cellSize;
		this.cols = opts.cols;
		this.rows = opts.rows;

		this.maxX = opts.cols * opts.cellSize;
		this.maxY = opts.rows * opts.cellSize;

		this.previewLayer = new Konva.Layer({ listening: false });
		this.stage.add(this.previewLayer);

		this.previewRect = new Konva.Rect({
			visible: false,
			fill: 'rgba(107,107,107,0.32)',
			stroke: 'rgb(111,111,111)',
			dash: [5, 3],
			strokeWidth: 1,
			cornerRadius: 6,
		});
		this.originShadow = new Konva.Rect({
			visible: false,
			fill: 'rgba(107,107,107,0.18)',
			stroke: '#0084ff',
			dash: [3, 3],
			strokeWidth: 2,
			cornerRadius: 6,
		});

		this.previewLayer.add(this.previewRect, this.originShadow);
	}

	public startDrag(component: IBaseComponent) {
		const cfg = component.getConfiguration();
		const pos = component.getGlobalPosition();

		this.originShadow.position({
			x: pos.x,
			y: pos.y,
		});

		this.originShadow.size({
			width: cfg.width * this.cellSize,
			height: cfg.height * this.cellSize,
		});

		this.originShadow.visible(true);
		this.previewLayer.batchDraw();
	}

	public endDrag() {
		this.previewRect.visible(false);
		this.originShadow.visible(false);
		this.previewLayer.batchDraw();
	}

	/** Обновление превью-тени */
	public updatePreview(component: IBaseComponent) {
		const cfg = component.getConfiguration();

		const { x: rawX, y: rawY } = component.getGlobalPosition();

		const snapX = Math.round(rawX / this.cellSize) * this.cellSize;
		const snapY = Math.round(rawY / this.cellSize) * this.cellSize;

		this.previewRect.position({
			x: snapX,
			y: snapY,
		});

		this.previewRect.size({
			width: cfg.width * this.cellSize,
			height: cfg.height * this.cellSize,
		});

		this.previewRect.visible(true);
		this.previewLayer.batchDraw();
	}

	/** Показ тени для режима вставки (когда компонента еще нет) */
	public updateInjectPreview = (pixelX: number, pixelY: number, widthCells: number, heightCells: number) => {
		// 1. Привязка к сетке
		const snapX = Math.round(pixelX / this.cellSize) * this.cellSize;
		const snapY = Math.round(pixelY / this.cellSize) * this.cellSize;

		this.previewRect.position({
			x: snapX,
			y: snapY,
		});

		this.previewRect.size({
			width: widthCells * this.cellSize,
			height: heightCells * this.cellSize,
		});

		this.previewRect.visible(true);
		this.previewLayer.batchDraw();
	};

	/** Скрыть все тени */
	public hideAllPreviews = () => {
		this.previewRect.visible(false);
		this.originShadow.visible(false);
		this.previewLayer.batchDraw();
	};

	/** Финальное прилипание (World-based) */
	public applySnapFinal(component: IBaseComponent) {
		const config = component.getConfiguration();

		// 1️⃣ Получаем мировые координаты (В КЛЕТКАХ)
		const globalPos = component.getGlobalPosition();
		const { wx: rawWX, wy: rawWY } = UtilsEditor.pixelToWorld(globalPos);

		// 2️⃣ Snap к сетке (в world)
		let snapWX = Math.round(rawWX);
		let snapWY = Math.round(rawWY);

		// 3️⃣ Ограничения по полю (тоже в world)
		const halfW = config.width / 2;
		const halfH = config.height / 2;

		const minX = -UtilsEditor.halfCols + halfW;
		const maxX = UtilsEditor.halfCols - halfW;
		const minY = -UtilsEditor.halfRows + halfH;
		const maxY = UtilsEditor.halfRows - halfH;

		if (snapWX < minX) snapWX = minX;
		if (snapWX > maxX) snapWX = maxX;
		if (snapWY < minY) snapWY = minY;
		if (snapWY > maxY) snapWY = maxY;

		// 4️⃣ Сохраняем в конфигурацию
		component.setConfiguration((prev) => ({
			...prev,
			wx: snapWX,
			wy: snapWY,
		}));

		// 5️⃣ UI
		this.previewRect.visible(false);
		this.previewLayer.batchDraw();
	}
}
