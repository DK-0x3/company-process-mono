import { SchemeComponentType } from '@entities/scheme/model/types/SchemeComponentType';
import { Dot, DotSide } from '@features/scheme-editor/components/dot-arrow/Dot';
import { UtilsEditor } from '@features/scheme-editor/editor/UtilsEditor';
import { DEFAULT_CELL_SIZE } from '@features/scheme-editor/types/constants';
import { IPosition } from '@features/scheme-editor/types/IPosition';
import { WorldPoint } from '@features/scheme-editor/types/WorldPoint';
import Konva from 'konva';
import { ArrowActionConfig } from '@entities/scheme/model/types/ArrowActionConfig';

export interface ArrowConfig {
	id: number;
	fromDot: {
		side: DotSide;
		offset: number;
		parentComponentId: number;
	},
	toDot: {
		side: DotSide;
		offset: number;
		parentComponentId: number;
	},
	type: SchemeComponentType;
}

export class Arrow {
	private node: Konva.Group;
	private shape: Konva.Shape;
	private hitShape: Konva.Shape;

	private path: WorldPoint[] = [];
	private isEnableFocus: boolean = false;

	constructor(private from: Dot, private to: Dot) {
		this.node = new Konva.Group();

		this.hitShape = new Konva.Shape({
			stroke: 'transparent',
			strokeWidth: 30,
			lineCap: 'round',
			lineJoin: 'round',
			listening: true,
			// Важно: передаем и ctx, и shape
			sceneFunc: (ctx, shape) => this.draw(ctx, shape),
		});

		// --- ВИЗУАЛЬНЫЙ СЛОЙ ---
		this.shape = new Konva.Shape({
			stroke: '#000000',
			strokeWidth: 2,
			lineCap: 'round',
			lineJoin: 'round',
			listening: false,
			sceneFunc: (ctx, shape) => this.draw(ctx, shape),
		});

		this.node.add(this.hitShape);
		this.node.add(this.shape);
	}

	public getConfig = (): ArrowActionConfig => {
		const fromSide = this.from.getSide();
		const fromOffset = this.from.getOffset();
		const fromParentId = this.from.getParent().getConfiguration().id;
		const fromParentType = this.from.getParent().getConfiguration().type;

		const toSide = this.to.getSide();
		const toOffset = this.to.getOffset();
		const toParentId = this.to.getParent().getConfiguration().id;
		const toParentType = this.to.getParent().getConfiguration().type;

		return {
			fromDot: {
				side: fromSide,
				offset: fromOffset,
				parentComponentId: fromParentId,
				parentComponentType: fromParentType,
			},
			toDot: {
				side: toSide,
				offset: toOffset,
				parentComponentId: toParentId,
				parentComponentType: toParentType,
			},
		};
	};

	public setContextMenuListener = (
		listener: (e: Konva.KonvaEventObject<MouseEvent>, arrow: Arrow) => void
	)=> {
		this.hitShape.removeEventListener('contextmenu');
		this.hitShape.on('contextmenu', (ev) => {
			listener(ev, this);
			this.enableFocus();
		});
	};

	public enableFocus = () => {
		this.isEnableFocus = true;
		// Меняем цвет только визуального слоя
		this.shape.stroke('red');
		// Перерисовка нужна, чтобы обновился fillStyle наконечника
		this.node.getLayer()?.batchDraw();
	};

	public disableFocus = () => {
		this.isEnableFocus = false;
		this.shape.stroke('black');
		this.node.getLayer()?.batchDraw();
	};

	public isFocus = () => this.isEnableFocus;

	// ... геттеры и сеттеры path ...
	public getDotStart = () => this.from;
	public getDotEnd = () => this.to;
	public setPath = (path: WorldPoint[]) => { this.path = path; };


	// ОСНОВНОЙ МЕТОД ОТРИСОВКИ
	// Принимает контекст и КОНКРЕТНЫЙ shape, который сейчас рисуется
	private draw(ctx: Konva.Context, shape: Konva.Shape) {
		if (this.path.length < 2) return;

		const pts = this.path.map(UtilsEditor.worldToPixel);
		const r = DEFAULT_CELL_SIZE * 0.4;
		const arrowSize = DEFAULT_CELL_SIZE * 0.6;

		ctx.beginPath();
		ctx.moveTo(pts[0].x, pts[0].y);

		// --- Рисование линии с закруглениями ---
		for (let i = 1; i < pts.length - 1; i++) {
			const prev = pts[i - 1];
			const curr = pts[i];
			const next = pts[i + 1];

			const dx1 = curr.x - prev.x;
			const dy1 = curr.y - prev.y;
			const dx2 = next.x - curr.x;
			const dy2 = next.y - curr.y;

			const len1 = Math.hypot(dx1, dy1);
			const len2 = Math.hypot(dx2, dy2);

			const ux1 = dx1 / len1;
			const uy1 = dy1 / len1;
			const ux2 = dx2 / len2;
			const uy2 = dy2 / len2;

			const p1 = {
				x: curr.x - ux1 * r,
				y: curr.y - uy1 * r 
			};
			const p2 = {
				x: curr.x + ux2 * r,
				y: curr.y + uy2 * r 
			};

			ctx.lineTo(p1.x, p1.y);
			ctx.quadraticCurveTo(curr.x, curr.y, p2.x, p2.y);
		}

		const prev = pts[pts.length - 2];
		const last = pts[pts.length - 1];
		const dx = last.x - prev.x;
		const dy = last.y - prev.y;
		const len = Math.hypot(dx, dy);
		const ux = dx / len;
		const uy = dy / len;

		const lineEnd = {
			x: last.x - ux * arrowSize,
			y: last.y - uy * arrowSize,
		};

		ctx.lineTo(lineEnd.x, lineEnd.y);

		// 1. РИСУЕМ САМУ ЛИНИЮ
		// Применяем стили текущего шейпа (толстая обводка для хита, тонкая для визуала)
		ctx.fillStrokeShape(shape);


		// 2. ПОДГОТОВКА К РИСОВАНИЮ НАКОНЕЧНИКА
		// Ключевой момент: мы берем цвет обводки текущего shape и делаем его цветом ЗАЛИВКИ.
		// - Для визуала это будет 'black' или 'red'.
		// - Для хита это будет 'transparent'. Konva на хит-канвасе сама превратит
		//   любую заливку в сплошной цвет для детекции.
		ctx.fillStyle = shape.stroke();

		// 3. РИСУЕМ ЗАЛИТЫЙ ТРЕУГОЛЬНИК
		// Больше не нужно передавать shape внутрь
		this.drawArrowHead(ctx, prev, last, arrowSize);
	}

	private drawArrowHead(
		ctx: Konva.Context,
		from: IPosition,
		to: IPosition,
		size: number,
		angleDeg = 30
	) {
		const angle = Math.atan2(to.y - from.y, to.x - from.x);
		const half = (angleDeg * Math.PI) / 180;

		const x1 = to.x - size * Math.cos(angle - half);
		const y1 = to.y - size * Math.sin(angle - half);
		const x2 = to.x - size * Math.cos(angle + half);
		const y2 = to.y - size * Math.sin(angle + half);

		ctx.beginPath();
		ctx.moveTo(to.x, to.y);
		ctx.lineTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.closePath();

		// ВАЖНО: Только заливка. Никаких обводок.
		// Используется цвет, установленный в ctx.fillStyle в методе draw.
		ctx.fill();
	}

	public getKonvaNode() { return this.node; }

	public destroy = () => {
		this.from.disableConnect();
		this.to.disableConnect();
		this.node.destroy();
	};

	public onSingleClick = () => {
		if (this.isEnableFocus) {
			this.disableFocus();
			return;
		}
		this.enableFocus();
	};
}
