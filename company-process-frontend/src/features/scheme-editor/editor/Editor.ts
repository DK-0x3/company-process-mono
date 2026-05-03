import { Process } from '@entities/process/model/types/Process';
import { InitSchemeResponse } from '@entities/scheme/api/types';
import { DotSide } from '@entities/scheme/model/types/DotSide';
import { Task } from '@entities/task/model/types/Task';
import { Arrow } from '@features/scheme-editor/components/arrow/Arrow';
import { Dot } from '@features/scheme-editor/components/dot-arrow/Dot';
import { ProcessComponent } from '@features/scheme-editor/components/process-component/ProcessComponent';
import { TaskComponent } from '@features/scheme-editor/components/task-component/TaskComponent';
import { ActionController } from '@features/scheme-editor/controllers/ActionController';
import { ArrowController } from '@features/scheme-editor/controllers/ArrowController';
import { CameraController } from '@features/scheme-editor/controllers/CameraController';
import { GridRenderer } from '@features/scheme-editor/controllers/GridRenderer';
import { ResizeController } from '@features/scheme-editor/controllers/ResizeController';
import { SnapController } from '@features/scheme-editor/controllers/SnapController';
import { UtilsEditor } from '@features/scheme-editor/editor/UtilsEditor';
import { DEFAULT_CELL_SIZE } from '@features/scheme-editor/types/constants';
import { IBaseComponent } from '@features/scheme-editor/types/IBaseComponent';
import { Obstacle } from '@features/scheme-editor/types/Obstacle';
import { AppDispatch } from '@shared/lib/store/types/AppDispatch';
import Konva from 'konva';

const DEFAULT_BACKGROUND_COLOR = '#ffffff';

interface EditorProps {
    container: HTMLDivElement | string;
    cols?: number;
    rows?: number;
    cellSize?: number;
    initialComponents?: IBaseComponent[];
	dispatch: AppDispatch;
	ownerProcessId: number;
}

export class Editor {
	private readonly INJECT_HEIGHT = 3;

	private camera: CameraController;
	private gridRenderer: GridRenderer;
	private resizeController: ResizeController;
	private snapController: SnapController;
	private arrowController: ArrowController;
	private resizeObserver: ResizeObserver;
	private actionController: ActionController;

	private stage: Konva.Stage;
	private itemsLayer: Konva.Layer;
	private arrowLayer: Konva.Layer;

	private cols: number;
	private rows: number;
	private cellSize: number;

	private injectingProcess:
	{
		process: Process;
		width: number;
	}
	| null;

	private injectingTask:
		{
			task: Task;
			width: number;
		}
		| null;

	private components: IBaseComponent[] = [];

	private onProcessContextMenuCallback?: (e: Konva.KonvaEventObject<MouseEvent>, process: ProcessComponent) => void;
	private onTaskContextMenuCallback?: (e: Konva.KonvaEventObject<MouseEvent>, task: TaskComponent) => void;

	constructor(props: EditorProps) {
		this.cols = props.cols ?? 48;
		this.rows = props.rows ?? 48;
		this.cellSize = props.cellSize ?? 24;
		this.injectingProcess = null;
		this.injectingTask = null;

		this.actionController = new ActionController(props.dispatch, props.ownerProcessId);

		const container
            = typeof props.container === 'string'
            	? (document.getElementById(props.container) as HTMLDivElement)
            	: props.container;

		if (!container) {
			throw new Error('Container element not found');
		}

		this.stage = new Konva.Stage({
			container,
			width: container.clientWidth,
			height: container.clientHeight
		});

		this.resizeObserver = new ResizeObserver(() => {
			this.handleResize();
		});
		this.resizeObserver.observe(container);

		this.itemsLayer = new Konva.Layer();

		this.gridRenderer = new GridRenderer(this.stage, {
			cols: this.cols,
			rows: this.rows,
			cellSize: this.cellSize,
		});

		this.camera = new CameraController(this.stage, {
			cols: this.cols,
			rows: this.rows,
			cellSize: this.cellSize,
			grid: this.gridRenderer,
		});

		this.snapController = new SnapController(this.stage, {
			cellSize: this.cellSize,
			cols: this.cols,
			rows: this.rows,
		});

		this.arrowLayer = new Konva.Layer();
		this.stage.add(this.arrowLayer);
		this.stage.add(this.itemsLayer);

		this.arrowController = new ArrowController(this.stage, this.arrowLayer, this.getAllObstacles);
		this.arrowController.addEnableCreateArrowListener(() => this.setFreezeListenersExpectHover(true));
		this.arrowController.addDisableCreateArrowListener(() => this.setFreezeListenersExpectHover(false));
		this.arrowController.addCreateArrowListener((arrow) => {
			this.actionController.sendCreateArrow(arrow);
		});

		this.resizeController = new ResizeController(this.stage, { cellSize: this.cellSize });
        
		container.style.background = DEFAULT_BACKGROUND_COLOR;

		if (props.initialComponents) {
			this.setItems(props.initialComponents);
		}

		this.stage.on('click', (e) => {
			if (e.target !== this.stage) return;

			this.resizeController.clearSelection();
			this.arrowController.disableFocusArrowAll();
			this.components.forEach((c) => {
				c.disableFocus();
			});

			if (e.evt.button === 0) {
				if (this.injectingProcess) {
					const pointerPosition = this.stage.getPointerPosition();
					if (!pointerPosition) return;

					const stageTransform = this.stage.getAbsoluteTransform().copy()
						.invert();
					const pos = stageTransform.point(pointerPosition);

					const snappedX = Math.round(pos.x / this.cellSize) * this.cellSize;
					const snappedY = Math.round(pos.y / this.cellSize) * this.cellSize;

					const worldPoint = UtilsEditor.pixelToWorld({
						x: snappedX,
						y: snappedY,
					});

					const newProcessComponent = new ProcessComponent({
						process: this.injectingProcess.process,
						wx: worldPoint.wx,
						wy: worldPoint.wy,
						width: this.injectingProcess.width,
						height: this.INJECT_HEIGHT,
						id: this.injectingProcess.process.id, // TODO
					});

					this.addComponent(newProcessComponent, true);

					this.injectingProcess = null;
					this.snapController.hideAllPreviews();
				} else if (this.injectingTask) {
					const pointerPosition = this.stage.getPointerPosition();
					if (!pointerPosition) return;

					const stageTransform = this.stage.getAbsoluteTransform().copy()
						.invert();
					const pos = stageTransform.point(pointerPosition);

					const snappedX = Math.round(pos.x / this.cellSize) * this.cellSize;
					const snappedY = Math.round(pos.y / this.cellSize) * this.cellSize;

					const worldPoint = UtilsEditor.pixelToWorld({
						x: snappedX,
						y: snappedY,
					});

					const newTaskComponent = new TaskComponent({
						task: this.injectingTask.task,
						wx: worldPoint.wx,
						wy: worldPoint.wy,
						width: this.injectingTask.width,
						height: this.INJECT_HEIGHT,
						id: this.injectingTask.task.id, // TODO
					});

					this.addComponent(newTaskComponent, true);

					this.injectingTask = null;
					this.snapController.hideAllPreviews();
				}
			}
		});

		this.stage.on('mousemove', () => {
			if (this.injectingProcess) {
				const pointerPosition = this.stage.getPointerPosition();
				if (!pointerPosition) return;

				// Трансформируем координаты мыши в координаты мира (с учетом камеры)
				const stageTransform = this.stage.getAbsoluteTransform().copy()
					.invert();
				const pos = stageTransform.point(pointerPosition);

				this.snapController.updateInjectPreview(
					pos.x,
					pos.y,
					this.injectingProcess.width,
					this.INJECT_HEIGHT,
				);
			} else if (this.injectingTask) {
				const pointerPosition = this.stage.getPointerPosition();
				if (!pointerPosition) return;

				// Трансформируем координаты мыши в координаты мира (с учетом камеры)
				const stageTransform = this.stage.getAbsoluteTransform().copy()
					.invert();
				const pos = stageTransform.point(pointerPosition);

				this.snapController.updateInjectPreview(
					pos.x,
					pos.y,
					this.injectingTask.width,
					this.INJECT_HEIGHT,
				);
			}
		});

		this.stage.on('contextmenu', (e) => {
			e.evt.preventDefault();
			if (this.injectingProcess || this.injectingTask) {
				this.injectingProcess = null;
				this.snapController.hideAllPreviews();
			}
		});
	}

	public setOnProcessContextMenu = (
		callback: (e: Konva.KonvaEventObject<MouseEvent>, process: ProcessComponent) => void
	) => {
		this.onProcessContextMenuCallback = callback;
	};

	public setOnTaskContextMenu = (
		callback: (e: Konva.KonvaEventObject<MouseEvent>, task: TaskComponent) => void
	) => {
		this.onTaskContextMenuCallback = callback;
	};

	public setOnArrowContextMenu = (
		callback: (e: Konva.KonvaEventObject<MouseEvent>, arrow: Arrow) => void
	) => {
		this.arrowController.setOnContextMenuListener(callback);
	};

	// Deprecated
	public initComponentsOld = (processes: Process[], tasks: Task[]) => {
		// Если вообще ничего нет — выходим
		if (processes.length === 0 && tasks.length === 0) return;

		// Очищаем старое состояние
		this.components = [];
		this.itemsLayer.destroyChildren();

		const GAP_X = 4;
		const GAP_Y = 4;
		// Считаем общее количество элементов для определения сетки
		const totalCount = processes.length + tasks.length;
		const MAX_COLUMNS = Math.ceil(Math.sqrt(totalCount));

		// 1. Создаем единый массив данных для расчета позиций
		// Добавляем поле 'type', чтобы потом знать, какой компонент создавать
		const processesData = processes.map((p) => ({
			data: p,
			type: 'process' as const,
			width: Math.round(UtilsEditor.measureTextWidth(p.name, 16) / this.cellSize) + 2,
			height: this.INJECT_HEIGHT,
		}));

		const tasksData = tasks.map((t) => ({
			data: t,
			type: 'task' as const,
			width: Math.round(UtilsEditor.measureTextWidth(t.name, 16) / this.cellSize) + 2,
			height: this.INJECT_HEIGHT,
		}));

		// Объединяем всё в один список
		const allComponentsData = [...processesData, ...tasksData];

		// 2. Группировка в ряды (логика остается прежней)
		const rows: (typeof allComponentsData)[] = [];
		for (let i = 0; i < allComponentsData.length; i += MAX_COLUMNS) {
			rows.push(allComponentsData.slice(i, i + MAX_COLUMNS));
		}

		// 3. Расчет высоты для центрирования
		const totalContentHeight = rows.length * this.INJECT_HEIGHT + (rows.length - 1) * GAP_Y;
		let currentWY = -(totalContentHeight / 2);

		rows.forEach((row) => {
			const rowWidth = row.reduce((sum, item) => sum + item.width, 0) + (row.length - 1) * GAP_X;
			let currentWX = -(rowWidth / 2);

			row.forEach((item) => {
				const centerX = Math.round(currentWX + item.width / 2);
				const centerY = Math.round(currentWY + item.height / 2);

				// 4. Создаем нужный компонент в зависимости от типа
				let component: IBaseComponent;

				if (item.type === 'process') {
					component = new ProcessComponent({
						process: item.data as Process,
						wx: centerX,
						wy: centerY,
						width: item.width,
						height: item.height,
						id: item.data.id,
					});
				} else {
					// Предполагаю, что у вас есть TaskComponent.
					// Если его нет, создайте его по аналогии с ProcessComponent
					component = new TaskComponent({
						task: item.data as Task,
						wx: centerX,
						wy: centerY,
						width: item.width,
						height: item.height,
						id: item.data.id,
					});
				}

				this.addComponent(component);
				currentWX += item.width + GAP_X;
			});

			currentWY += this.INJECT_HEIGHT + GAP_Y;
		});

		this.itemsLayer.draw();
	};

	// Добавляет компоненты на холст в иерархическом порядке, используется при первой инициализации схемы.
	public initFirstComponents = (processes: Process[], tasks: Task[]) => {
		if (processes.length === 0 && tasks.length === 0) return;

		// 1. Очистка холста
		this.components = [];
		this.itemsLayer.destroyChildren();
		this.arrowLayer.destroyChildren();
		const componentMap = new Map<string, any>();

		const GAP_X = 6; // Расстояние между соседями на одном уровне
		const GAP_Y = 5; // Расстояние между родителями и детьми (уровнями)

		// --- ШАГ 1: Построение дерева уровней ---
		const levels: Map<number, (Process | Task)[]> = new Map();
		const processIds = new Set(processes.map((p) => p.id));

		// Определяем корни (процессы, у которых родитель не входит в текущий список или отсутствует)
		const roots = processes.filter((p) => !p.parentId || !processIds.has(p.parentId));

		const assignLevel = (items: (Process | Task)[], depth: number) => {
			if (items.length === 0) return;
			if (!levels.has(depth)) levels.set(depth, []);

			// Добавляем элементы на текущий уровень, исключая дубликаты
			items.forEach((item) => {
				const isAlreadyAdded = levels.get(depth)!.some((existing) =>
					('processId' in item ? `t-${item.id}` : `p-${item.id}`)
					=== ('processId' in existing ? `t-${existing.id}` : `p-${existing.id}`)
				);
				if (!isAlreadyAdded) levels.get(depth)!.push(item);
			});

			items.forEach((item) => {
				if (!('processId' in item)) { // Если это процесс, ищем его детей и задачи
					const children = processes.filter((p) => p.parentId === item.id);
					const processTasks = tasks.filter((t) => t.processId === item.id);
					assignLevel([...children, ...processTasks], depth + 1);
				}
			});
		};

		assignLevel(roots, 0);

		// --- ШАГ 2: Расчет позиций (Сверху вниз и Центрирование) ---
		const sortedLevelKeys = Array.from(levels.keys()).sort((a, b) => a - b);

		// Считаем общую высоту дерева
		const totalHeight = sortedLevelKeys.length * this.INJECT_HEIGHT + (sortedLevelKeys.length - 1) * GAP_Y;
		let startWY = -(totalHeight / 2);

		sortedLevelKeys.forEach((level) => {
			const items = levels.get(level)!;

			// Предварительно считаем ширину всего уровня
			const rowItems = items.map((item) => ({
				item,
				width: Math.round(UtilsEditor.measureTextWidth(item.name, 16) / this.cellSize) + 2
			}));

			const rowWidth = rowItems.reduce((sum, d) => sum + d.width, 0) + (items.length - 1) * GAP_X;
			let currentWX = -(rowWidth / 2); // Центрируем ряд по горизонтали

			rowItems.forEach((node) => {
				const centerX = Math.round(currentWX + node.width / 2);
				const centerY = Math.round(startWY + this.INJECT_HEIGHT / 2);

				const isTask = 'processId' in node.item;
				const globalId = isTask ? `task-${node.item.id}` : `proc-${node.item.id}`;

				let component: any;
				if (isTask) {
					component = new TaskComponent({
						task: node.item as Task,
						wx: centerX,
						wy: centerY,
						width: node.width,
						height: this.INJECT_HEIGHT,
						id: node.item.id,
					});
				} else {
					component = new ProcessComponent({
						process: node.item as Process,
						wx: centerX,
						wy: centerY,
						width: node.width,
						height: this.INJECT_HEIGHT,
						id: node.item.id,
					});
				}

				this.addComponent(component);
				componentMap.set(globalId, component);
				currentWX += node.width + GAP_X;
			});

			// Переходим на следующий уровень вниз
			startWY += this.INJECT_HEIGHT + GAP_Y;
		});

		// --- ШАГ 3: Авто-стрелки (Bottom -> Top) ---
		// Связи Процесс -> Подпроцесс
		processes.forEach((proc) => {
			if (proc.parentId && componentMap.has(`proc-${proc.parentId}`)) {
				const parent = componentMap.get(`proc-${proc.parentId}`);
				const child = componentMap.get(`proc-${proc.id}`);
				if (parent && child) {
					this.arrowController.createArrow(
						parent.getCentralDot('bottom'),
						child.getCentralDot('top')
					);
				}
			}
		});

		// Связи Процесс -> Задача
		tasks.forEach((task) => {
			const parent = componentMap.get(`proc-${task.processId}`);
			const child = componentMap.get(`task-${task.id}`);
			if (parent && child) {
				this.arrowController.createArrow(
					parent.getCentralDot('bottom'),
					child.getCentralDot('top')
				);
			}
		});

		this.arrowController.updateAll();
		this.itemsLayer.draw();

		const processComponents = this.components.filter(
			(c): c is ProcessComponent => c instanceof ProcessComponent
		);

		const taskComponents = this.components.filter(
			(c): c is TaskComponent => c instanceof TaskComponent
		);

		const arrows = this.arrowController.getArrows();

		this.actionController.sendInitSchemeAction(
			processComponents,
			taskComponents,
			arrows
		);
	};

	public initSchemeComponents = (scheme: InitSchemeResponse) => {
		// 1. Быстрая проверка
		if (scheme.processes.length === 0 && scheme.tasks.length === 0) return;

		// 2. Очистка холста (аналогично initFirstComponents)
		this.components = [];
		this.itemsLayer.destroyChildren();
		this.arrowLayer.destroyChildren();
		// Если в arrowController есть метод очистки состояния, вызови его, например:
		// this.arrowController.clear();

		// Карта для поиска компонентов по их ID из базы данных (Component ID)
		// Ключи будут вида: "p-10" (processComponentId=10) или "t-5" (taskComponentId=5)
		const componentMap = new Map<string, any>();
		const allSchemeComponents = [
			...scheme.processes,
			...scheme.tasks
		];
		const hasLegacyPixelComponents = allSchemeComponents.some(
			(component) => component.width > 60 || component.height > 30
		);
		const tinyNearCenterCount = allSchemeComponents.filter((component) =>
			component.width <= 1.2
			&& component.height <= 1.2
			&& Math.abs(component.x) <= 10
			&& Math.abs(component.y) <= 10
		).length;
		const hasCollapsedTinyScheme = allSchemeComponents.length > 1
			&& tinyNearCenterCount / allSchemeComponents.length >= 0.8;

		// --- ШАГ 1: Создание компонентов процессов ---
		scheme.processes.forEach((p) => {
			const normalized = this.normalizeSchemeGeometry({
				x: p.x,
				y: p.y,
				width: p.width,
				height: p.height,
				title: p.process.name,
				hasLegacyPixelComponents,
				hasCollapsedTinyScheme,
			});

			const component = new ProcessComponent({
				// Передаем бизнес-объект
				process: p.process,
				// Передаем координаты и размеры из базы
				wx: normalized.x,
				wy: normalized.y,
				width: normalized.width,
				height: normalized.height,
				// Можно также сохранить ID самого компонента, если нужно для обновлений
				id: p.id
			});

			this.addComponent(component);
			// Сохраняем в карту по ID КОМПОНЕНТА (p.id), а не процесса
			componentMap.set(`p-${p.id}`, component);
		});

		// --- ШАГ 2: Создание компонентов задач ---
		scheme.tasks.forEach((t) => {
			const normalized = this.normalizeSchemeGeometry({
				x: t.x,
				y: t.y,
				width: t.width,
				height: t.height,
				title: t.task.name,
				hasLegacyPixelComponents,
				hasCollapsedTinyScheme,
			});

			const component = new TaskComponent({
				task: t.task,
				wx: normalized.x,
				wy: normalized.y,
				width: normalized.width,
				height: normalized.height,
				id: t.id
			});

			this.addComponent(component);
			componentMap.set(`t-${t.id}`, component);
		});

		// --- ШАГ 3: Восстановление стрелок ---
			scheme.arrows.forEach((arrow) => {
			// 3.1. Ищем компонент "ОТКУДА"
			let fromComponent: any = null;
			if (arrow.fromProcessComponentId) {
				fromComponent = componentMap.get(`p-${arrow.fromProcessComponentId}`);
			} else if (arrow.fromTaskComponentId) {
				fromComponent = componentMap.get(`t-${arrow.fromTaskComponentId}`);
			}

			// 3.2. Ищем компонент "КУДА"
			let toComponent: any = null;
			if (arrow.toProcessComponentId) {
				toComponent = componentMap.get(`p-${arrow.toProcessComponentId}`);
			} else if (arrow.toTaskComponentId) {
				toComponent = componentMap.get(`t-${arrow.toTaskComponentId}`);
			}

				// 3.3. Если оба компонента найдены на холсте — создаем стрелку
				if (fromComponent && toComponent) {
					const fromDot = this.resolveDotForArrow(
						fromComponent,
						arrow.fromSide,
						arrow.fromOffset
					);
					const toDot = this.resolveDotForArrow(
						toComponent,
						arrow.toSide,
						arrow.toOffset
					);

					if (!fromDot || !toDot) {
						return;
					}

					this.arrowController.createArrow(fromDot, toDot);

				// Если нужно сохранить ID стрелки для будущего удаления/редактирования:
				// const createdArrow = this.arrowController.createArrow(...);
				// createdArrow.setId(arrow.id);
			}
		});

		// 4. Финальная отрисовка
		this.arrowController.updateAll();
		this.itemsLayer.draw();
		this.arrowLayer.draw();
	};

	public syncWithSource = (processes: Process[], tasks: Task[]) => {
		const validProcessIds = new Set(processes.map((process) => process.id));
		const validTaskIds = new Set(tasks.map((task) => task.id));
		let changed = false;

		const staleProcessIds = this.components
			.filter((component): component is ProcessComponent => component instanceof ProcessComponent)
			.map((component) => component.getProcess().id)
			.filter((processId) => !validProcessIds.has(processId));
		staleProcessIds.forEach((processId) => {
			this.deleteProcessComponent(processId);
			changed = true;
		});

		const staleTaskIds = this.components
			.filter((component): component is TaskComponent => component instanceof TaskComponent)
			.map((component) => component.getTask().id)
			.filter((taskId) => !validTaskIds.has(taskId));
		staleTaskIds.forEach((taskId) => {
			this.deleteTaskComponent(taskId);
			changed = true;
		});

		const existingProcessIds = new Set(
			this.components
				.filter((component): component is ProcessComponent => component instanceof ProcessComponent)
				.map((component) => component.getProcess().id),
		);
		const existingTaskIds = new Set(
			this.components
				.filter((component): component is TaskComponent => component instanceof TaskComponent)
				.map((component) => component.getTask().id),
		);

		processes
			.filter((process) => !existingProcessIds.has(process.id))
			.forEach((process) => {
				const width = Math.max(
					3,
					Math.round(UtilsEditor.measureTextWidth(process.name, 16) / this.cellSize) + 2,
				);
				const preferred = process.parentId
					? this.getProcessComponentByProcessId(process.parentId)
					: undefined;
				const preferredPosition = preferred
					? {
						wx: preferred.getConfiguration().wx,
						wy: preferred.getConfiguration().wy + preferred.getConfiguration().height + 2,
					}
					: undefined;
				const position = this.findFreePosition(width, this.INJECT_HEIGHT, preferredPosition);

				const component = new ProcessComponent({
					process,
					wx: position.wx,
					wy: position.wy,
					width,
					height: this.INJECT_HEIGHT,
					id: process.id,
				});

				this.addComponent(component);
				changed = true;
			});

		tasks
			.filter((task) => !existingTaskIds.has(task.id))
			.forEach((task) => {
				const width = Math.max(
					3,
					Math.round(UtilsEditor.measureTextWidth(task.name, 16) / this.cellSize) + 2,
				);
				const parentProcessComponent = this.getProcessComponentByProcessId(task.processId);
				const preferredPosition = parentProcessComponent
					? {
						wx: parentProcessComponent.getConfiguration().wx + 2,
						wy: parentProcessComponent.getConfiguration().wy
							+ parentProcessComponent.getConfiguration().height + 2,
					}
					: undefined;
				const position = this.findFreePosition(width, this.INJECT_HEIGHT, preferredPosition);

				const component = new TaskComponent({
					task,
					wx: position.wx,
					wy: position.wy,
					width,
					height: this.INJECT_HEIGHT,
					id: task.id,
				});

				this.addComponent(component);
				changed = true;
			});

		if (!changed) {
			return;
		}

		this.arrowController.updateAll();
		this.itemsLayer.draw();
		this.arrowLayer.draw();

		const processComponents = this.components.filter(
			(component): component is ProcessComponent => component instanceof ProcessComponent,
		);
		const taskComponents = this.components.filter(
			(component): component is TaskComponent => component instanceof TaskComponent,
		);
		const arrows = this.arrowController.getArrows();

		this.actionController.sendInitSchemeAction(
			processComponents,
			taskComponents,
			arrows,
		);
	};

	private normalizeSchemeGeometry = (geometry: {
		x: number;
		y: number;
		width: number;
		height: number;
		title: string;
		hasLegacyPixelComponents: boolean;
		hasCollapsedTinyScheme: boolean;
	}) => {
		const isLegacyPixelComponent = geometry.width > 60 || geometry.height > 30;
		if (!isLegacyPixelComponent) {
			const looksCorruptedAfterDoubleNormalization
				= geometry.hasLegacyPixelComponents
				&& geometry.width <= 1.2
				&& geometry.height <= 1.2
				&& Math.abs(geometry.x) <= 10
				&& Math.abs(geometry.y) <= 10;
			const looksCollapsedInTinyScheme
				= geometry.hasCollapsedTinyScheme
				&& geometry.width <= 1.2
				&& geometry.height <= 1.2;

			if (looksCorruptedAfterDoubleNormalization || looksCollapsedInTinyScheme) {
				const repairedWidth = Math.max(
					3,
					Math.round(UtilsEditor.measureTextWidth(geometry.title, 16) / this.cellSize) + 2,
				);
				return {
					x: geometry.x * this.cellSize,
					y: geometry.y * this.cellSize,
					width: repairedWidth,
					height: this.INJECT_HEIGHT,
				};
			}

			return {
				x: geometry.x,
				y: geometry.y,
				width: Math.max(1, geometry.width),
				height: Math.max(1, geometry.height),
			};
		}

		const toWorld = (value: number) => Math.round((value / this.cellSize) * 100) / 100;
		return {
			x: toWorld(geometry.x),
			y: toWorld(geometry.y),
			width: Math.max(1, toWorld(geometry.width)),
			height: Math.max(1, toWorld(geometry.height)),
		};
	};

	private resolveDotForArrow = (
		component: ProcessComponent | TaskComponent,
		side: DotSide,
		offset: number
	): Dot | undefined => {
		const byOffset = component.getDot(side, offset);
		if (byOffset) {
			return byOffset;
		}

		const byCenter = component.getCentralDot(side);
		if (byCenter) {
			return byCenter;
		}

		const fallbackSides: DotSide[] = [
			'top',
			'right',
			'bottom',
			'left'
		];

		for (const fallbackSide of fallbackSides) {
			const candidateByCenter = component.getCentralDot(fallbackSide);
			if (candidateByCenter) {
				return candidateByCenter;
			}

			const candidateByOffset = component.getDot(fallbackSide, 1);
			if (candidateByOffset) {
				return candidateByOffset;
			}
		}

		return undefined;
	};

	private getProcessComponentByProcessId = (processId: number) =>
		this.components.find(
			(component) => component instanceof ProcessComponent
				&& component.getProcess().id === processId,
		) as ProcessComponent | undefined;

	private findFreePosition = (
		width: number,
		height: number,
		preferred?: { wx: number; wy: number },
	) => {
		const halfCols = this.cols / 2;
		const halfRows = this.rows / 2;
		const minX = Math.ceil(-halfCols + 1);
		const maxX = Math.floor(halfCols - width - 1);
		const minY = Math.ceil(-halfRows + 1);
		const maxY = Math.floor(halfRows - height - 1);

		const isFree = (wx: number, wy: number) =>
			this.components.every((component) => {
				const cfg = component.getConfiguration();
				return (
					wx + width <= cfg.wx
					|| cfg.wx + cfg.width <= wx
					|| wy + height <= cfg.wy
					|| cfg.wy + cfg.height <= wy
				);
			});

		const clamp = (wx: number, wy: number) => ({
			wx: Math.min(maxX, Math.max(minX, Math.round(wx))),
			wy: Math.min(maxY, Math.max(minY, Math.round(wy))),
		});

		if (preferred) {
			for (let radius = 0; radius <= 24; radius++) {
				for (let dx = -radius; dx <= radius; dx++) {
					for (let dy = -radius; dy <= radius; dy++) {
						if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
							continue;
						}
						const candidate = clamp(preferred.wx + dx, preferred.wy + dy);
						if (isFree(candidate.wx, candidate.wy)) {
							return candidate;
						}
					}
				}
			}
		}

		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x++) {
				if (isFree(x, y)) {
					return {
						wx: x,
						wy: y,
					};
				}
			}
		}

		return clamp(0, 0);
	};
	
	public getAllObstacles = (): Obstacle[] => {
		return this.components.map((c) => UtilsEditor.componentToObstacle(c));
	};

	public runInjectProcess = (process: Process) => {
		const width = Math.round(UtilsEditor.measureTextWidth(
			process.name, 16) / DEFAULT_CELL_SIZE + 2
		);

		this.injectingProcess = {
			process,
			width,
		};
	};

	public runInjectTask = (task: Task) => {
		const width = Math.round(UtilsEditor.measureTextWidth(
			task.name, 16) / DEFAULT_CELL_SIZE + 2
		);

		this.injectingTask = {
			task,
			width,
		};
	};

	public setItems(components: IBaseComponent[]) {
		this.components = components;
		this.renderItems();
	}

	public getItems(): IBaseComponent[] {
		return this.components;
	}

	public exportSchemeDataUrl = (options?: {
		pixelRatio?: number;
		padding?: number;
		hideGrid?: boolean;
		mimeType?: string;
		quality?: number;
	}) => {
		const pixelRatio = options?.pixelRatio ?? 2;
		const padding = options?.padding ?? 40;
		const mimeType = options?.mimeType;
		const quality = options?.quality;
		const gridLayer = this.gridRenderer.getLayer();
		const shouldHideGrid = Boolean(options?.hideGrid);

		if (shouldHideGrid) {
			gridLayer.visible(false);
		}

		try {
			this.arrowController.updateAll();
			this.itemsLayer.draw();
			this.arrowLayer.draw();
			this.stage.batchDraw();

			if (this.components.length === 0) {
				return this.stage.toDataURL({
					pixelRatio,
					mimeType,
					quality,
				});
			}

			const scale = this.stage.scaleX();
			const stageX = this.stage.x();
			const stageY = this.stage.y();

			const bounds = this.components.map((component) => {
				const position = component.getGlobalPosition();
				const dimension = component.getGlobalDimension();
				return {
					left: position.x * scale + stageX,
					top: position.y * scale + stageY,
					right: (position.x + dimension.width) * scale + stageX,
					bottom: (position.y + dimension.height) * scale + stageY,
				};
			});

			const minX = Math.min(...bounds.map((bound) => bound.left));
			const minY = Math.min(...bounds.map((bound) => bound.top));
			const maxX = Math.max(...bounds.map((bound) => bound.right));
			const maxY = Math.max(...bounds.map((bound) => bound.bottom));

			const cropX = Math.max(0, Math.floor(minX - padding));
			const cropY = Math.max(0, Math.floor(minY - padding));
			const cropRight = Math.min(
				this.stage.width(),
				Math.ceil(maxX + padding),
			);
			const cropBottom = Math.min(
				this.stage.height(),
				Math.ceil(maxY + padding),
			);
			const cropWidth = Math.max(1, cropRight - cropX);
			const cropHeight = Math.max(1, cropBottom - cropY);

			return this.stage.toDataURL({
				x: cropX,
				y: cropY,
				width: cropWidth,
				height: cropHeight,
				pixelRatio,
				mimeType,
				quality,
			});
		} finally {
			if (shouldHideGrid) {
				gridLayer.visible(true);
				this.stage.batchDraw();
			}
		}
	};

	public destroy = () => {
		this.resizeObserver.disconnect();
		this.stage.destroy();
	};

	public updateProcessComponent = (process: Process) => {
		const processComponents = this.components.filter((c) => c instanceof ProcessComponent);
		if (processComponents.length === 0) return;

		processComponents.forEach((processComponent) => {
			if (processComponent.getProcess().id === process.id) {
				processComponent.setProcess(process);
			}
		});
	};

	public updateTaskComponent = (task: Task) => {
		const taskComponents = this.components.filter((c) => c instanceof TaskComponent);
		if (taskComponents.length === 0) return;

		taskComponents.forEach((c) => {
			if (c.getTask().id === task.id) {
				c.setTask(task);
			}
		});
	};

	public deleteProcessComponent = (processId: number) => {
		// 1. Ищем индекс компонента в массиве
		const index = this.components.findIndex((c) =>
			c instanceof ProcessComponent && c.getProcess().id === processId
		);

		// Если компонент не найден, ничего не делаем
		if (index === -1) return;

		const componentToDelete = this.components[index];

		// 2. Визуальное удаление: уничтожаем Konva-узел
		// Это автоматически уберет его с itemsLayer и очистит память
		this.arrowController.deleteArrowsByComponent(componentToDelete);
		componentToDelete.destroy();

		// 3. Очистка состояния контроллеров
		// Если удаляемый объект был выделен для ресайза — снимаем выделение
		this.resizeController.clearSelection();

		// 4. Удаление из массива данных
		this.components.splice(index, 1);

		// 5. Обновление зависимостей
		// Пересчитываем стрелки, так как одно из препятствий (Obstacle) исчезло
		this.arrowController.updateAll();

		// 6. Перерисовываем слой для мгновенного обновления
		this.itemsLayer.draw();
	};

	public deleteTaskComponent = (taskId: number) => {
		// 1. Ищем индекс компонента в массиве
		const index = this.components.findIndex((c) =>
			c instanceof TaskComponent && c.getTask().id === taskId
		);

		// Если компонент не найден, ничего не делаем
		if (index === -1) return;

		const componentToDelete = this.components[index];

		// 2. Визуальное удаление: уничтожаем Konva-узел
		// Это автоматически уберет его с itemsLayer и очистит память
		componentToDelete.destroy();

		this.arrowController.deleteArrowsByComponent(componentToDelete);

		// 3. Очистка состояния контроллеров
		// Если удаляемый объект был выделен для ресайза — снимаем выделение
		this.resizeController.clearSelection();

		// 4. Удаление из массива данных
		this.components.splice(index, 1);

		// 5. Обновление зависимостей
		// Пересчитываем стрелки, так как одно из препятствий (Obstacle) исчезло
		this.arrowController.updateAll();

		// 6. Перерисовываем слой для мгновенного обновления
		this.itemsLayer.draw();
	};

	public deleteArrowComponent = () => {
		this.arrowController.deleteArrowByFocus(this.actionController.sendDeleteArrow);
	};

	private renderItems = () =>{
		this.itemsLayer.destroyChildren();
		this.resizeController.clearSelection();

		this.components.forEach((component) => {
			component.addEnableEditModeListener(() => this.resizeController.select(component));
			component.addDisableEditModeListener(() => this.resizeController.clearSelection());

			component.addOnDragStartListener(() => {
				this.snapController.startDrag(component);
			});

			component.addOnDragMoveListener(() => {
				this.snapController.updatePreview(component);
				this.resizeController.updateHandlesAfterMove();
			});

			component.addOnDragEndListener(() => {
				this.snapController.applySnapFinal(component);
				this.resizeController.updateHandlesAfterMove();
				this.snapController.endDrag();
			});
			
			component.addConfigListener(() => {
				this.arrowController.updateAll();
			});

			component.addOnMouseDownListener((e) => {
				if (e.evt.button === 0) {
					component.enableDraggable();
				} else {
					component.disableDraggable();
				}
			});

			component.enableDraggable();

			if (component instanceof ProcessComponent) {
				component.addOnClickDotListeners(this.arrowController.onClickCreateArrow);
				component.addOnEnableHoverListener(() => this.arrowController.onEnableHoverComponent(component));
				component.addOnDisableHoverListener(() => this.arrowController.onDisableHoverComponent(component));
			}

			this.itemsLayer.add(component.getKonvaNode());
		});

		this.itemsLayer.draw();
	};

	private addComponent = (component: IBaseComponent, persist: boolean = false) => {
		component.addEnableEditModeListener(() => this.resizeController.select(component));
		component.addDisableEditModeListener(() => this.resizeController.clearSelection());

		component.addOnDragStartListener(() => {
			this.snapController.startDrag(component);
		});

		component.addOnDragMoveListener(() => {
			this.snapController.updatePreview(component);
			this.resizeController.updateHandlesAfterMove();
		});

		component.addOnDragEndListener(() => {
			this.snapController.applySnapFinal(component);
			this.resizeController.updateHandlesAfterMove();
			this.snapController.endDrag();
		});

		component.addConfigListener(() => {
			this.arrowController.updateAll();
			this.actionController.sendUpdateComponent(component);
		});

		component.addOnMouseDownListener((e) => {
			if (e.evt.button === 0) {
				component.enableDraggable();
			} else {
				component.disableDraggable();
			}
		});

		component.enableDraggable();

		if (component instanceof ProcessComponent) {
			component.addOnClickDotListeners(this.arrowController.onClickCreateArrow);
			component.addOnEnableHoverListener(() => this.arrowController.onEnableHoverComponent(component));
			component.addOnDisableHoverListener(() => this.arrowController.onDisableHoverComponent(component));

			component.addOnContextMenuListener((e) => {
				e.evt.preventDefault();
				this.onProcessContextMenuCallback?.(e, component);
			});
		} else if (component instanceof TaskComponent) {
			component.addOnClickDotListeners(this.arrowController.onClickCreateArrow);
			component.addOnEnableHoverListener(() => this.arrowController.onEnableHoverComponent(component));
			component.addOnDisableHoverListener(() => this.arrowController.onDisableHoverComponent(component));

			component.addOnContextMenuListener((e) => {
				e.evt.preventDefault();
				this.onTaskContextMenuCallback?.(e, component);
			});
		}

		this.components.push(component);
		this.itemsLayer.add(component.getKonvaNode());
		this.itemsLayer.draw();

		if (persist) {
			if (component instanceof ProcessComponent) {
				this.actionController.sendCreateProcessComponent(component);
			} else if (component instanceof TaskComponent) {
				this.actionController.sendCreateTaskComponent(component);
			}
		}
	};

	private setFreezeListenersExpectHover = (isFreeze: boolean) => {
		this.components.forEach((c) => c.freezeListenersExpectHover(isFreeze));
	};

	private handleResize() {
		const container = this.stage.container();

		// clientWidth/Height берут только ВНУТРЕННЕЕ пространство за вычетом рамок
		const newWidth = container.clientWidth;
		const newHeight = container.clientHeight;

		// Проверяем, изменился ли размер, чтобы не перерисовывать лишний раз
		if (this.stage.width() !== newWidth || this.stage.height() !== newHeight) {
			this.stage.width(newWidth);
			this.stage.height(newHeight);

			// После изменения размеров Stage, нужно обновить Grid и слои
			this.stage.batchDraw();
		}
	}
}
