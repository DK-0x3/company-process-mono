import { SchemeComponentType } from '@entities/scheme/model/types/SchemeComponentType';
import { Task } from '@entities/task/model/types/Task';
import {
	Dot, DotConfig, DotSide 
} from '@features/scheme-editor/components/dot-arrow/Dot';
import { RectComponent, RectComponentConfig } from '@features/scheme-editor/components/rect-component/RectComponent';
import { KonvaEvent } from '@features/scheme-editor/types/KonvaEvent';
import { KonvaEventListener } from '@features/scheme-editor/types/KonvaEventListener';
import Konva from 'konva';

const DEFAULT_FILL = '#ffffff';
const DEFAULT_COLOR = '#000000';
const DEFAULT_STROKE_COLOR = '#ff9e00';
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_CORNER_RADIUS = 10;

export interface TaskComponentConfig extends RectComponentConfig {
	task: Task;
	type: SchemeComponentType.TASK;
}

interface TaskComponentProps {
	id: number;
	task: Task;
	width: number;
	height: number;
	wx: number;
	wy: number;
}

export class TaskComponent extends RectComponent<TaskComponentConfig> {
	private dots: Dot[] = [];
	private dotsLayer: Konva.Group = new Konva.Group({
		listening: true,
		visible: false 
	});

	private clickTimeout: NodeJS.Timeout | null = null;
	
	private enableFocusListeners: VoidFunction[];
	private disableFocusListeners: VoidFunction[];

	private enableEditModeListeners: VoidFunction[];
	private disableEditModeListeners: VoidFunction[];

	private enableHoverListeners: VoidFunction[];
	private disableHoverListeners: VoidFunction[];

	private onClickDotListeners: ((dot: Dot) => void)[];

	private listeners = {
		click: [] as KonvaEventListener[],
		dblclick: [] as KonvaEventListener[],
		mousedown: [] as KonvaEventListener[],
		mouseup: [] as KonvaEventListener[],
		dragstart: [] as KonvaEventListener[],
		dragmove: [] as KonvaEventListener[],
		dragend: [] as KonvaEventListener[],
		contextmenu: [] as KonvaEventListener[],
	};

	private isFreezeListenersExpectHover: boolean;

	constructor(props: TaskComponentProps) {
		const config: TaskComponentConfig = {
			...props,
			fill: DEFAULT_FILL,
			color: DEFAULT_COLOR,
			strokeColor: DEFAULT_STROKE_COLOR,
			strokeWidth: DEFAULT_STROKE_WIDTH,
			cornerRadius: DEFAULT_CORNER_RADIUS,
			title: props.task.name,
			id: props.id,
			type: SchemeComponentType.TASK,
		};
		super(config);

		this.initInternalEventListeners();
		
		this.enableFocusListeners = [];
		this.disableFocusListeners = [];
		this.enableEditModeListeners = [];
		this.disableEditModeListeners = [];
		this.onClickDotListeners = [];
		this.enableHoverListeners = [];
		this.disableHoverListeners = [];
		this.isFreezeListenersExpectHover = false;

		this.node.id(config.id.toString());
		this.node.add(this.dotsLayer);

		this.generateInitialDots();
		this.updateDots();

		this.addConfigListener(this.onUpdateConfig);
		this.addOnClickListener(this.onSingleClick);
		this.addOnDoubleClickListener(this.onDoubleClick);

		this.node.on('mouseenter', this.onEnableHover);
		this.node.on('mouseleave', this.onDisableHover);

		// this.node.on('mouseenter', () => {
		// 	console.log(this.configuration);
		// });
	}

	public getTask = () => this.configuration.task;

	public setTask = (task: Task) => {
		this.configuration.task = task;
		this.configuration.title = task.name;
		this.text.text(task.name);
	};

	/** * Ищет точку на указанной стороне, которая находится максимально близко к центру
	 */
	public getCentralDot(side: DotSide): Dot | undefined {
		const cfg = this.getConfiguration();

		// Вычисляем идеальный офсет (середина стороны)
		// Для top/bottom середина — это половина ширины, для left/right — половина высоты
		const isHorizontalSide = side === 'top' || side === 'bottom';
		const idealOffset = Math.floor((isHorizontalSide ? cfg.width : cfg.height) / 2);

		const sideDots = this.dots.filter((dot) => dot.getSide() === side);
		if (sideDots.length === 0) return undefined;

		// Ищем точку с минимальной разницей между её офсетом и идеальным центром
		return sideDots.reduce((prev, curr) => {
			const currDiff = Math.abs(curr.getOffset() - idealOffset);
			const prevDiff = Math.abs(prev.getOffset() - idealOffset);
			return currDiff < prevDiff ? curr : prev;
		});
	}

	public addOnClickDotListeners = (listener: (dot: Dot) => void) => {
		this.onClickDotListeners.push(listener);

		this.dots.forEach((dot) => {
			dot.addOnClickListeners(listener);
		});
	};

	public setEditMode = (editMode: boolean) => {
		this.isEnableEditMode = editMode;
	};

	public getIsEnableFocus = () => this.isEnableFocus;
	public getIsEnableEditMode = () => this.isEnableEditMode;

	public regenerateDots = () => {
		const cfg = this.getConfiguration();

		// 1. Разделяем точки на те, что оставляем, и те, что удаляем
		const connectedDots = this.dots.filter((d) => d.isEnableConnect());
		const dotsToDestroy = this.dots.filter((d) => !d.isEnableConnect());

		// 2. Уничтожаем ТОЛЬКО неподключенные точки
		dotsToDestroy.forEach((dot) => dot.destroy());

		// 3. Теперь создаем новый массив точек, начиная с тех, что сохранили
		const newDots: Dot[] = [...connectedDots];
		let idCounter = 0;

		const maxOffsetX = cfg.width - 1;
		const maxOffsetY = cfg.height - 1;

		// 4. Обновляем ID и параметры для сохраненных точек (чтобы не было конфликтов)
		newDots.forEach((dot) => {
			const side = dot.getSide();
			const maxOffset = (side === 'top' || side === 'bottom') ? maxOffsetX : maxOffsetY;
			const clampedOffset = Math.max(1, Math.min(dot.getOffset(), maxOffset));

			dot.setOffset(clampedOffset);
			dot.setId(`${side}_keep_${idCounter++}`);
			// Мы НЕ вызываем dotsLayer.add, так как узел и так уже в слое
		});

		// 5. Вспомогательная функция для проверки, занято ли место
		const isPlaceFree = (side: DotSide, offset: number) =>
			!newDots.some((d) => d.getSide() === side && d.getOffset() === offset);

		// 6. Генерируем новые "свободные" точки на пустых местах
		const addFreeDotIfPossible = (side: DotSide, offset: number) => {
			if (isPlaceFree(side, offset)) {
				newDots.push(this.createDot({
					id: `${side}_free_${idCounter++}`,
					side,
					offset,
				}));
			}
		};

		// Проходим по периметру
		for (let i = 1; i < cfg.width; i++) {
			addFreeDotIfPossible('top', i);
			addFreeDotIfPossible('bottom', i);
		}
		for (let i = 1; i < cfg.height; i++) {
			addFreeDotIfPossible('left', i);
			addFreeDotIfPossible('right', i);
		}

		this.dots = newDots;
		this.dots.forEach((dot) => {
			dot.addOnClickListeners(...this.onClickDotListeners);
		});
		this.updateDots();
	};

	public enableArrowMode = () => {
		this.dots.forEach((dot) => dot.enable());
	};

	public disableArrowMode = () => {
		this.dots.forEach((dot) => dot.disable());
	};

	private createDot = (cfg: DotConfig): Dot => {
		const dot = new Dot(this, cfg);
		this.dotsLayer.add(dot.getKonvaNode());

		this.dots.forEach((dot) => {
			dot.addOnClickListeners(...this.onClickDotListeners);
		});

		return dot;
	};

	/** обновляем позиции всех точек */
	public updateDots() {
		this.dots.forEach((dot) => dot.updatePosition());
	}

	public getDots() {
		return this.dots;
	}

	public getDot = (side: DotSide, offset: number) => {
		// 1. Пробуем найти точку с точным совпадением offset
		const exactDot = this.dots.find((d) => d.getSide() === side && d.getOffset() === offset);
		if (exactDot) return exactDot;

		// 2. Если точной точки нет, ищем все точки на этой стороне
		const sideDots = this.dots.filter((d) => d.getSide() === side);

		if (sideDots.length === 0) {
			// Если на стороне вообще нет точек (маловероятно, но возможно при width/height < 2)
			return undefined;
		}

		// 3. Ищем ближайшую точку к запрошенному offset (Fallback)
		// Это спасет стрелки при изменении размеров компонента
		return sideDots.reduce((prev, curr) => {
			const prevDiff = Math.abs(prev.getOffset() - offset);
			const currDiff = Math.abs(curr.getOffset() - offset);
			return currDiff < prevDiff ? curr : prev;
		});
	};

	public enableFocus = () => {
		this.disableEditMode();
		this.isEnableFocus = true;
		this.dotsLayer.visible(true);
		this.enableFocusListeners.forEach((l) => l());
	};

	public disableFocus = () => {
		this.isEnableFocus = false;
		this.dotsLayer.visible(false);
		this.disableFocusListeners.forEach((l) => l());
	};

	public addEnableFocusListener = (listener: VoidFunction) => {
		this.enableFocusListeners.push(listener);
	};

	public addDisableFocusListener = (listener: VoidFunction) => {
		this.disableFocusListeners.push(listener);
	};

	public enableEditMode = () => {
		this.disableFocus();
		this.isEnableEditMode = true;
		this.enableEditModeListeners.forEach((l) => l());
	};

	public disableEditMode = () => {
		this.isEnableEditMode = false;
		this.disableEditModeListeners.forEach((l) => l());
	};

	public addEnableEditModeListener = (listener: VoidFunction) => {
		this.enableEditModeListeners.push(listener);
	};

	public addDisableEditModeListener = (listener: VoidFunction) => {
		this.disableEditModeListeners.push(listener);
	};

	public enableDraggable = () => {
		this.node.draggable(true);
	};

	public disableDraggable = () => {
		this.node.draggable(false);
	};

	public freezeListenersExpectHover = (isFreeze: boolean) => {
		this.isFreezeListenersExpectHover = isFreeze;

		if (isFreeze) {
			this.disableDraggable();
		} else {
			this.enableDraggable();
		}
	};

	/**
	 * Создает единые точки входа для событий Konva.
	 * Здесь же обрабатывается логика "заморозки" (freeze).
	 */
	private initInternalEventListeners() {
		const eventTypes = Object.keys(this.listeners) as (keyof typeof this.listeners)[];

		eventTypes.forEach((eventType) => {
			this.node.on(eventType, (e) => {
				// Если слушатели заморожены, прерываем выполнение для всех событий, кроме hover (если нужно)
				// Так как в списке нет mouseenter/mouseleave, эти события сработают всегда
				if (this.isFreezeListenersExpectHover) {
					return;
				}

				// Вызываем всех подписчиков для данного типа события
				const handlers = this.listeners[eventType];
				handlers.forEach((handler) => handler(e));
			});
		});
	}

	public addOnClickListener = (listener: KonvaEventListener) => {
		this.listeners.click.push(listener);
	};

	public addOnDoubleClickListener = (listener: KonvaEventListener) => {
		this.listeners.dblclick.push(listener);
	};

	public addOnDragMoveListener = (listener: KonvaEventListener) => {
		this.listeners.dragmove.push(listener);
	};

	public addOnDragEndListener = (listener: KonvaEventListener) => {
		this.listeners.dragend.push(listener);
	};

	public addOnDragStartListener = (listener: KonvaEventListener) => {
		this.listeners.dragstart.push(listener);
	};

	public addOnMouseDownListener = (listener: KonvaEventListener) => {
		this.listeners.mousedown.push(listener);
	};

	public addOnMouseUpListener = (listener: KonvaEventListener) => {
		this.listeners.mouseup.push(listener);
	};

	public addOnContextMenuListener = (listener: KonvaEventListener) => {
		this.listeners.contextmenu.push(listener);
	};

	public addOnEnableHoverListener = (listener: VoidFunction) => {
		this.enableHoverListeners.push(listener);
	};

	public addOnDisableHoverListener = (listener: VoidFunction) => {
		this.disableHoverListeners.push(listener);
	};

	/** генерируем точки по периметру при первой загрузке */
	private generateInitialDots() {
		const cfg = this.getConfiguration();
		const dots: Dot[] = [];
		let id = 0;

		const push = (side: DotSide, offset: number) => {
			dots.push(
				this.createDot({
					id: `${side}_${id++}`,
					side,
					offset,
				})
			);
		};

		for (let i = 1; i < cfg.width; i++) {
			push('top', i);
			push('bottom', i);
		}
		for (let i = 1; i < cfg.height; i++) {
			push('left', i);
			push('right', i);
		}

		this.dots = dots;
	}

	private onUpdateConfig = () => {
		this.regenerateDots();
	};
	
	private onSingleClick = (e: KonvaEvent) => {
		if (e.evt.button !== 0) return;

		if (this.clickTimeout) {
			clearTimeout(this.clickTimeout);
			this.clickTimeout = null;
			return;
		}

		this.clickTimeout = setTimeout(() => {
			this.clickTimeout = null;
			this.enableFocus();
		}, 200);
	};

	private onDoubleClick = (e: KonvaEvent) => {
		if (e.evt.button !== 0) return;

		if (this.clickTimeout) {
			clearTimeout(this.clickTimeout);
			this.clickTimeout = null;
		}

		this.enableEditMode();
	};

	private onEnableHover = () => {
		this.enableHoverListeners.forEach((l) => l());
	};

	private onDisableHover = () => {
		this.disableHoverListeners.forEach((l) => l());
	};
}