import { InitSchemeResponse } from '@entities/scheme/api/types';

type SchemeNode = {
	id: number;
	type: 'process' | 'task';
	x: number;
	y: number;
	width: number;
	height: number;
	label: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const median = (values: number[]) => {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) {
		return sorted[middle];
	}
	return (sorted[middle - 1] + sorted[middle]) / 2;
};

const resolveLayoutScale = (
	rawWidths: number[],
	rawHeights: number[],
) => {
	const cleanWidths = rawWidths.filter((value) => Number.isFinite(value) && value > 0);
	const cleanHeights = rawHeights.filter((value) => Number.isFinite(value) && value > 0);
	if (cleanWidths.length === 0 || cleanHeights.length === 0) {
		return 1;
	}

	const widthMedian = median(cleanWidths);
	const heightMedian = median(cleanHeights);

	// В некоторых схемах координаты и размеры сохранялись в "ячейках", а не пикселях.
	// Тогда масштабируем ВСЮ геометрию целиком (и x/y, и w/h), чтобы не было наложений.
	if (widthMedian <= 80 && heightMedian <= 40) {
		return clamp(180 / Math.max(widthMedian, 1), 2, 12);
	}

	return 1;
};

const normalizeSize = (
	value: number,
	fallback: number,
	scale: number,
	minValue: number,
) => {
	if (!Number.isFinite(value) || value <= 0) {
		return fallback;
	}

	return Math.max(minValue, value * scale);
};

const wrapCanvasText = (
	ctx: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
) => {
	const words = text.trim().split(/\s+/);
	if (words.length === 0) {
		return [''];
	}

	const lines: string[] = [];
	let line = '';

	words.forEach((word) => {
		const candidate = line ? `${line} ${word}` : word;
		if (ctx.measureText(candidate).width <= maxWidth || !line) {
			line = candidate;
			return;
		}

		lines.push(line);
		line = word;
	});

	if (line) {
		lines.push(line);
	}

	return lines;
};

const getDotCoordinates = (
	node: SchemeNode,
	side: string,
	offset: number,
) => {
	const safeOffset = Number.isFinite(offset) ? Math.min(1, Math.max(0, offset)) : 0.5;
	switch (side) {
		case 'left':
			return { x: node.x, y: node.y + node.height * safeOffset };
		case 'right':
			return { x: node.x + node.width, y: node.y + node.height * safeOffset };
		case 'top':
			return { x: node.x + node.width * safeOffset, y: node.y };
		case 'bottom':
			return { x: node.x + node.width * safeOffset, y: node.y + node.height };
		default:
			return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
	}
};

export const buildDiagramDataUrl = (
	scheme: InitSchemeResponse | undefined,
	processName: string,
) => {
	if (!scheme) {
		return undefined;
	}

	const rawWidths = [
		...scheme.processes.map((component) => component.width),
		...scheme.tasks.map((component) => component.width),
	];
	const rawHeights = [
		...scheme.processes.map((component) => component.height),
		...scheme.tasks.map((component) => component.height),
	];
	const layoutScale = resolveLayoutScale(rawWidths, rawHeights);

	const processNodes: SchemeNode[] = scheme.processes.map((component) => ({
		id: component.id,
		type: 'process' as const,
		x: component.x * layoutScale,
		y: component.y * layoutScale,
		width: normalizeSize(component.width, 260, layoutScale, 140),
		height: normalizeSize(component.height, 120, layoutScale, 70),
		label: component.process?.name ?? `Процесс #${component.processId}`,
	}));

	const taskNodes: SchemeNode[] = scheme.tasks.map((component) => ({
		id: component.id,
		type: 'task' as const,
		x: component.x * layoutScale,
		y: component.y * layoutScale,
		width: normalizeSize(component.width, 220, layoutScale, 110),
		height: normalizeSize(component.height, 90, layoutScale, 56),
		label: component.task?.name ?? `Задача #${component.taskId}`,
	}));

	const nodes: SchemeNode[] = [...processNodes, ...taskNodes];

	if (nodes.length === 0) {
		return undefined;
	}

	const minX = Math.min(...nodes.map((node) => node.x));
	const minY = Math.min(...nodes.map((node) => node.y));
	const maxX = Math.max(...nodes.map((node) => node.x + node.width));
	const maxY = Math.max(...nodes.map((node) => node.y + node.height));
	const padding = 48;

	const canvas = document.createElement('canvas');
	canvas.width = Math.max(640, Math.ceil(maxX - minX + padding * 2));
	canvas.height = Math.max(420, Math.ceil(maxY - minY + padding * 2 + 56));

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return undefined;
	}

	const shiftX = padding - minX;
	const shiftY = padding - minY + 46;

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = '#202020';
	ctx.font = '600 22px Ubuntu, Arial, sans-serif';
	ctx.fillText(`Схема процесса: ${processName}`, padding, 34);

	const nodeByProcessId = new Map<number, SchemeNode>(
		processNodes.map((node) => [node.id, node]),
	);
	const nodeByTaskId = new Map<number, SchemeNode>(
		taskNodes.map((node) => [node.id, node]),
	);

	ctx.strokeStyle = '#5f6368';
	ctx.fillStyle = '#5f6368';
	ctx.lineWidth = 2;

	scheme.arrows.forEach((arrow) => {
		const fromNode = arrow.fromTaskComponentId
			? nodeByTaskId.get(arrow.fromTaskComponentId)
			: arrow.fromProcessComponentId
				? nodeByProcessId.get(arrow.fromProcessComponentId)
				: undefined;
		const toNode = arrow.toTaskComponentId
			? nodeByTaskId.get(arrow.toTaskComponentId)
			: arrow.toProcessComponentId
				? nodeByProcessId.get(arrow.toProcessComponentId)
				: undefined;

		if (!fromNode || !toNode) {
			return;
		}

		const from = getDotCoordinates(fromNode, arrow.fromSide, arrow.fromOffset);
		const to = getDotCoordinates(toNode, arrow.toSide, arrow.toOffset);
		const startX = from.x + shiftX;
		const startY = from.y + shiftY;
		const endX = to.x + shiftX;
		const endY = to.y + shiftY;

		ctx.beginPath();
		ctx.moveTo(startX, startY);
		ctx.lineTo(endX, endY);
		ctx.stroke();

		const angle = Math.atan2(endY - startY, endX - startX);
		const arrowSize = 8;
		ctx.beginPath();
		ctx.moveTo(endX, endY);
		ctx.lineTo(
			endX - arrowSize * Math.cos(angle - Math.PI / 6),
			endY - arrowSize * Math.sin(angle - Math.PI / 6),
		);
		ctx.lineTo(
			endX - arrowSize * Math.cos(angle + Math.PI / 6),
			endY - arrowSize * Math.sin(angle + Math.PI / 6),
		);
		ctx.closePath();
		ctx.fill();
	});

	nodes.forEach((node) => {
		const drawX = node.x + shiftX;
		const drawY = node.y + shiftY;
		const fill = node.type === 'process' ? '#eaf2ff' : '#eef7ee';
		const stroke = node.type === 'process' ? '#4469b0' : '#4f7d4f';

		ctx.fillStyle = fill;
		ctx.strokeStyle = stroke;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.rect(drawX, drawY, node.width, node.height);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = '#202020';
		const fontSize = clamp(Math.round(node.height * 0.23), 13, 18);
		const lineHeight = fontSize + 4;
		const maxLines = Math.max(1, Math.floor((node.height - 14) / lineHeight));
		ctx.font = `600 ${fontSize}px Ubuntu, Arial, sans-serif`;
		const lines = wrapCanvasText(ctx, node.label, node.width - 16).slice(0, maxLines);
		lines.forEach((line, index) => {
			const safeLine = index === maxLines - 1 && line.length > 36
				? `${line.slice(0, 35)}…`
				: line;
			ctx.fillText(safeLine, drawX + 8, drawY + 10 + fontSize + index * lineHeight);
		});
	});

	return canvas.toDataURL('image/png');
};
