import { Arrow } from '@features/scheme-editor/components/arrow/Arrow';
import { Dot, DotSide } from '@features/scheme-editor/components/dot-arrow/Dot';
import { IBaseComponent } from '@features/scheme-editor/types/IBaseComponent';
import { Obstacle } from '@features/scheme-editor/types/Obstacle';
import { WorldPoint } from '@features/scheme-editor/types/WorldPoint';
import Konva from 'konva';
import toast from 'react-hot-toast';

type Direction = 'up' | 'down' | 'left' | 'right';

const DIRS: Direction[] = [
	'up',
	'down',
	'left',
	'right'
];

const DIR_VEC: Record<Direction, { dx: number; dy: number }> = {
	up: {
		dx: 0,
		dy: -1 
	},
	down: {
		dx: 0,
		dy: 1 
	},
	left: {
		dx: -1,
		dy: 0 
	},
	right: {
		dx: 1,
		dy: 0 
	},
};

function sideToDirection(side: DotSide): Direction {
	switch (side) {
	case 'top': return 'up';
	case 'bottom': return 'down';
	case 'left': return 'left';
	case 'right': return 'right';
	}
	throw new Error(`Unsupported dot side: ${side}`);
}

function opposite(dir: Direction): Direction {
	switch (dir) {
	case 'up': return 'down';
	case 'down': return 'up';
	case 'left': return 'right';
	case 'right': return 'left';
	}
}

function step(p: WorldPoint, dir: Direction, dist = 1): WorldPoint {
	const v = DIR_VEC[dir];
	return {
		wx: p.wx + v.dx * dist,
		wy: p.wy + v.dy * dist 
	};
}

function manhattan(a: WorldPoint, b: WorldPoint) {
	return Math.abs(a.wx - b.wx) + Math.abs(a.wy - b.wy);
}

/** если точки могут быть не целые — подними на сетку */
function snap(p: WorldPoint): WorldPoint {
	return {
		wx: Math.round(p.wx),
		wy: Math.round(p.wy) 
	};
}

function pointKeyXY(x: number, y: number) {
	return `${x}|${y}`;
}

function stateKey(x: number, y: number, dir: Direction) {
	return `${x}|${y}|${dir}`;
}

/** включительно, как у тебя в проверках */
function pointInObstacle(p: WorldPoint, o: Obstacle): boolean {
	return p.wx >= o.minX && p.wx <= o.maxX && p.wy >= o.minY && p.wy <= o.maxY;
}

function pointInAnyObstacle(p: WorldPoint, obstacles: Obstacle[]): boolean {
	for (const o of obstacles) {
		if (pointInObstacle(p, o)) return true;
	}
	return false;
}

/**
 * Так как start/end лежат на объектах:
 * - берем точку на 1 клетку по side
 * - если она все еще внутри препятствий — выходим дальше, пока не окажемся снаружи
 */
function buildPortOutside(
	anchor: WorldPoint,
	dir: Direction,
	obstacles: Obstacle[],
	maxSteps = 50
): WorldPoint {
	let p = step(anchor, dir, 1);
	let i = 0;

	while (i < maxSteps && pointInAnyObstacle(p, obstacles)) {
		p = step(p, dir, 1);
		i++;
	}

	return p;
}

/** убираем дубликаты и прямые промежуточные точки */
function normalizePath(path: WorldPoint[]): WorldPoint[] {
	const noDup: WorldPoint[] = [];
	for (const p of path) {
		const last = noDup[noDup.length - 1];
		if (!last || last.wx !== p.wx || last.wy !== p.wy) noDup.push(p);
	}
	if (noDup.length <= 2) return noDup;

	const res: WorldPoint[] = [noDup[0]];
	for (let i = 1; i < noDup.length - 1; i++) {
		const a = res[res.length - 1];
		const b = noDup[i];
		const c = noDup[i + 1];

		const collinear
			= (a.wx === b.wx && b.wx === c.wx)
			|| (a.wy === b.wy && b.wy === c.wy);

		if (!collinear) res.push(b);
	}
	res.push(noDup[noDup.length - 1]);
	return res;
}

/** простой бинарный heap */
class MinHeap<T> {
	private a: T[] = [];
	constructor(private less: (x: T, y: T) => boolean) {}

	push(x: T) {
		this.a.push(x);
		this.siftUp(this.a.length - 1);
	}

	pop(): T | undefined {
		if (this.a.length === 0) return undefined;
		const root = this.a[0];
		const last = this.a.pop()!;
		if (this.a.length > 0) {
			this.a[0] = last;
			this.siftDown(0);
		}
		return root;
	}

	get size() {
		return this.a.length;
	}

	private siftUp(i: number) {
		while (i > 0) {
			const p = (i - 1) >> 1;
			if (!this.less(this.a[i], this.a[p])) break;
			[this.a[i], this.a[p]] = [this.a[p], this.a[i]];
			i = p;
		}
	}

	private siftDown(i: number) {
		for (;;) {
			const l = i * 2 + 1;
			const r = l + 1;
			let m = i;

			if (l < this.a.length && this.less(this.a[l], this.a[m])) m = l;
			if (r < this.a.length && this.less(this.a[r], this.a[m])) m = r;

			if (m === i) break;
			[this.a[i], this.a[m]] = [this.a[m], this.a[i]];
			i = m;
		}
	}
}

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

/** строим bounds, чтобы A* не ушел в бесконечность */
function calcBounds(
	startOut: WorldPoint,
	endIn: WorldPoint,
	obstacles: Obstacle[],
	padding = 20
): Bounds {
	let minX = Math.min(startOut.wx, endIn.wx);
	let maxX = Math.max(startOut.wx, endIn.wx);
	let minY = Math.min(startOut.wy, endIn.wy);
	let maxY = Math.max(startOut.wy, endIn.wy);

	for (const o of obstacles) {
		minX = Math.min(minX, o.minX);
		maxX = Math.max(maxX, o.maxX);
		minY = Math.min(minY, o.minY);
		maxY = Math.max(maxY, o.maxY);
	}

	return {
		minX: minX - padding,
		maxX: maxX + padding,
		minY: minY - padding,
		maxY: maxY + padding,
	};
}

/** делаем blocked set (по клеткам) */
function buildBlockedSet(
	obstacles: Obstacle[],
	clearance = 0,
	exceptions: WorldPoint[] = []
): Set<string> {
	const exc = new Set(exceptions.map((p) => pointKeyXY(p.wx, p.wy)));
	const blocked = new Set<string>();

	for (const o of obstacles) {
		const minX = Math.floor(o.minX - clearance);
		const maxX = Math.ceil(o.maxX + clearance);
		const minY = Math.floor(o.minY - clearance);
		const maxY = Math.ceil(o.maxY + clearance);

		for (let x = minX; x <= maxX; x++) {
			for (let y = minY; y <= maxY; y++) {
				const k = pointKeyXY(x, y);
				if (!exc.has(k)) blocked.add(k);
			}
		}
	}

	return blocked;
}

/**
 * A* по сетке, состояние = (x,y,dir) чтобы:
 * - штрафовать повороты
 * - запретить "подъехал к endIn снизу (dir=toDir) и развернулся в end"
 */
function routeAStar(params: {
	start: WorldPoint;
	startDir: Direction;
	goal: WorldPoint;
	forbiddenGoalArriveDir?: Direction; // обычно = toDir
	blocked: Set<string>;
	bounds: Bounds;
	turnCost?: number;
}): WorldPoint[] | null {
	const {
		start,
		startDir,
		goal,
		forbiddenGoalArriveDir,
		blocked,
		bounds,
		turnCost = 3,
	} = params;

	const startState = {
		x: start.wx,
		y: start.wy,
		dir: startDir,
		g: 0,
		f: manhattan(start, goal) 
	};
	const startK = stateKey(startState.x, startState.y, startState.dir);

	const bestG = new Map<string, number>();
	const parent = new Map<string, string | null>();
	const statePos = new Map<string, { x: number; y: number; dir: Direction }>();

	bestG.set(startK, 0);
	parent.set(startK, null);
	statePos.set(startK, {
		x: startState.x,
		y: startState.y,
		dir: startState.dir 
	});

	const open = new MinHeap<{ x: number; y: number; dir: Direction; g: number; f: number; k: string }>(
		(a, b) => (a.f !== b.f ? a.f < b.f : a.g < b.g)
	);
	open.push({
		...startState,
		k: startK 
	});

	let goalKey: string | null = null;

	while (open.size > 0) {
		const cur = open.pop()!;
		const curBest = bestG.get(cur.k);
		if (curBest === undefined || cur.g !== curBest) continue; // устаревшая запись

		if (cur.x === goal.wx && cur.y === goal.wy) {
			if (!forbiddenGoalArriveDir || cur.dir !== forbiddenGoalArriveDir) {
				goalKey = cur.k;
				break;
			}
		}

		for (const ndir of DIRS) {
			const v = DIR_VEC[ndir];
			const nx = cur.x + v.dx;
			const ny = cur.y + v.dy;

			if (nx < bounds.minX || nx > bounds.maxX || ny < bounds.minY || ny > bounds.maxY) continue;

			const cellK = pointKeyXY(nx, ny);
			if (blocked.has(cellK)) continue;

			const addTurn = ndir === cur.dir ? 0 : turnCost;
			const ng = cur.g + 1 + addTurn;

			const nk = stateKey(nx, ny, ndir);
			const prev = bestG.get(nk);
			if (prev !== undefined && ng >= prev) continue;

			bestG.set(nk, ng);
			parent.set(nk, cur.k);
			statePos.set(nk, {
				x: nx,
				y: ny,
				dir: ndir 
			});

			const nf = ng + Math.abs(nx - goal.wx) + Math.abs(ny - goal.wy);
			open.push({
				x: nx,
				y: ny,
				dir: ndir,
				g: ng,
				f: nf,
				k: nk 
			});
		}
	}

	if (!goalKey) return null;

	// восстановление пути (точки клеток)
	const rev: WorldPoint[] = [];
	let k: string | null = goalKey;
	while (k) {
		const s = statePos.get(k)!;
		rev.push({
			wx: s.x,
			wy: s.y 
		});
		k = parent.get(k) ?? null;
	}
	rev.reverse();
	return rev;
}

function buildSmartWorldPathWithAvoidance(
	arrow: Arrow,
	obstacles: Obstacle[]
): WorldPoint[] {
	const from = arrow.getDotStart();
	const to = arrow.getDotEnd();

	const start = snap(from.getWorldPoint()); // центр Dot (на объекте)
	const end = snap(to.getWorldPoint()); // центр Dot (на объекте)

	const fromDir = sideToDirection(from.getSide());
	const toDir = sideToDirection(to.getSide());

	// Порт выхода из start-объекта
	const startOut = buildPortOutside(start, fromDir, obstacles);

	// Порт входа в end (точка С ТОЙ СТОРОНЫ, куда смотрит side)
	// если side=top => toDir=up => endIn будет выше end, и последний сегмент пойдет вниз (как надо)
	const endIn = buildPortOutside(end, toDir, obstacles);

	// Если вдруг startOut/endIn все равно в блоке из-за clearance или других объектов — можно разрулить дальше,
	// но базово мы уже вышли "наружу".

	const bounds = calcBounds(startOut, endIn, obstacles, 30);

	// ВАЖНО:
	// чтобы не было "подъехал снизу к endIn (dir=up) и тут же развернулся вниз в end"
	// запрещаем приходить в endIn направлением = toDir
	const forbiddenArriveDir = toDir;

	// Блокируем препятствия, но разрешаем клетки startOut/endIn (на всякий случай)
	const blocked = buildBlockedSet(obstacles, /* clearance */ 0, [startOut, endIn]);

	// Частный кейс: если startOut == endIn.
	// Тогда путь: start -> startOut -> end.
	// Но если fromDir === toDir, получится разворот на endIn. Сделаем маленький “обвод” в сторону.
	if (startOut.wx === endIn.wx && startOut.wy === endIn.wy) {
		if (fromDir !== toDir) {
			return normalizePath([
				start,
				startOut,
				end
			]);
		}

		const perp: Direction[]
			= (fromDir === 'up' || fromDir === 'down') ? ['left', 'right'] : ['up', 'down'];

		for (const d of perp) {
			const a = step(startOut, d, 1);
			const b = step(a, opposite(d), 1); // вернемся, но другой точкой в маршруте
			if (!blocked.has(pointKeyXY(a.wx, a.wy)) && !blocked.has(pointKeyXY(b.wx, b.wy))) {
				return normalizePath([
					start,
					startOut,
					a,
					end
				]);
			}
		}

		// fallback
		return normalizePath([
			start,
			startOut,
			end
		]);
	}

	const routed = routeAStar({
		start: startOut,
		startDir: fromDir,
		goal: endIn,
		forbiddenGoalArriveDir: forbiddenArriveDir,
		blocked,
		bounds,
		turnCost: 3, // ↑ увеличь, если хочешь меньше поворотов
	});

	// fallback если маршрут не найден
	if (!routed) {
		// простой L как запасной вариант, но с корректным входом
		const mid: WorldPoint
			= (fromDir === 'up' || fromDir === 'down')
				? {
					wx: endIn.wx,
					wy: startOut.wy 
				}
				: {
					wx: startOut.wx,
					wy: endIn.wy 
				};

		return normalizePath([
			start,
			startOut,
			mid,
			endIn,
			end
		]);
	}

	// финальный путь: start -> startOut -> ... -> endIn -> end
	// routed уже содержит startOut и endIn
	return normalizePath([
		start,
		...routed,
		end
	]);
}

export class ArrowController {
	private stage: Konva.Stage;
	private layer: Konva.Layer;

	private arrows: Arrow[] = [];
	private isActiveCreateArrow: boolean;

	private startDot: Dot | null;

	private enableCreateArrowListeners: VoidFunction[];
	private disableCreateArrowListeners: VoidFunction[];
	private createArrowListeners: Array<(arrow: Arrow) => void>;

	private onArrowContextMenuCallback?: (e: Konva.KonvaEventObject<MouseEvent>, arrow: Arrow) => void;

	constructor(stage: Konva.Stage, layer: Konva.Layer, private getObstacles: () => Obstacle[]) {
		this.stage = stage;
		this.layer = layer;

		this.isActiveCreateArrow = false;
		this.enableCreateArrowListeners = [];
		this.disableCreateArrowListeners = [];
		this.createArrowListeners = [];
		this.startDot = null;
	}

	public disableFocusArrowAll = () => {
		this.arrows.forEach((arrow) => arrow.disableFocus());
	};

	public setOnContextMenuListener = (
		listener: (e: Konva.KonvaEventObject<MouseEvent>, arrow: Arrow) => void
	) => {
		this.onArrowContextMenuCallback = (e, arrow) => {
			this.disableFocusArrowAll();
			listener(e, arrow);
		};

		this.arrows.forEach((arrow) => {
			arrow.setContextMenuListener(this.onArrowContextMenuCallback!);
		});
	};

	public deleteArrowByFocus = (callback: (arrow: Arrow) => void) => {
		this.arrows.forEach((arrow) => {
			if (arrow.isFocus()) {
				callback(arrow);
				arrow.destroy();
				this.arrows = this.arrows.filter((a) => a !== arrow);
			}
		});

		this.layer.batchDraw();
	};

	// Удаляет все стрелки привязанные к компоненту
	public deleteArrowsByComponent = (component: IBaseComponent) => {
		this.arrows.forEach((arrow) => {
			const parentStart = arrow.getDotStart().getParent();
			const parentEnd = arrow.getDotEnd().getParent();

			if (parentStart === component || parentEnd === component) {
				arrow.destroy();
				this.arrows = this.arrows.filter((a) => a !== arrow);
			}
		});

		this.layer.batchDraw();
	};

	public addEnableCreateArrowListener = (listener: VoidFunction) => {
		this.enableCreateArrowListeners.push(listener);
	};

	public addDisableCreateArrowListener = (listener: VoidFunction) => {
		this.disableCreateArrowListeners.push(listener);
	};

	public addCreateArrowListener = (listener: (arrow: Arrow) => void) => {
		this.createArrowListeners.push(listener);
	};

	public onEnableHoverComponent = (component: IBaseComponent) => {
		if (this.isActiveCreateArrow) {
			component.enableFocus();
		}
	};

	public onDisableHoverComponent = (component: IBaseComponent) => {
		if (this.isActiveCreateArrow) {
			component.disableFocus();
		}
	};

	public createArrow = (startDot: Dot, endDot: Dot) => {
		if (startDot.getParent() === endDot.getParent()) return;

		const arrow = new Arrow(startDot, endDot);
		if (this.onArrowContextMenuCallback) {
			arrow.setContextMenuListener(this.onArrowContextMenuCallback);
		}
		this.addArrows(arrow);
	};

	public onClickCreateArrow = (dot: Dot) => {
		if (this.isActiveCreateArrow) {
			if (dot.getParent() === this.startDot?.getParent()) {
				toast.error('Ошибка, нельзя соединить процесс с самим собой');
				return;
			}

			this.isActiveCreateArrow = false;
			this.disableCreateArrowListeners.forEach((l) => l());

			if (this.startDot) {
				const arrow = new Arrow(this.startDot, dot);
				this.addArrows(arrow);
				this.updateAll();
				this.createArrowListeners.forEach((listener) => listener(arrow));
			}
		} else {
			this.isActiveCreateArrow = true;
			this.enableCreateArrowListeners.forEach((l) => l());
			this.startDot = dot;
		}
	};

	public addArrows = (...arrows: Arrow[]) => {
		this.arrows.push(...arrows);
		this.layer.add(...arrows.map((arrow) => arrow.getKonvaNode()));
		this.layer.batchDraw();
	};

	/** вызывается Editor при move/resize */
	public updateAll = () => {
		const obstacles = this.getObstacles();

		this.arrows.forEach((arrow) => {
			const path = buildSmartWorldPathWithAvoidance(arrow, obstacles);
			arrow.setPath(path);
		});

		this.layer.batchDraw();
	};

	public getArrows = () => {
		return this.arrows;
	};
}
