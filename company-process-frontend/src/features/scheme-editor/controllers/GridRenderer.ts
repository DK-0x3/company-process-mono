import Konva from 'konva';

const DEFAULT_LINES_COLOR = '#f4f4f4';

interface GridOptions {
	cols: number;
	rows: number;
	cellSize: number;
	color?: string;
}

export class GridRenderer {
	private stage: Konva.Stage;
	private layer: Konva.Layer;
	private opts: GridOptions;

	constructor(stage: Konva.Stage, opts: GridOptions) {
		this.stage = stage;
		this.opts = {
			color: DEFAULT_LINES_COLOR,
			...opts
		};

		this.layer = new Konva.Layer({
			listening: false
		});

		this.stage.add(this.layer);
		this.drawGrid();
	}

	private drawGrid() {
		const {
			cols, rows, cellSize, color 
		} = this.opts;

		const width = cols * cellSize;
		const height = rows * cellSize;

		// Вертикальные линии
		for (let c = 0; c <= cols; c++) {
			const x = c * cellSize + 0.5;
			const line = new Konva.Line({
				points: [
					x,
					0,
					x,
					height
				],
				stroke: color,
				strokeWidth: 2
			});
			this.layer.add(line);
		}

		// Горизонтальные линии
		for (let r = 0; r <= rows; r++) {
			const y = r * cellSize + 0.5;
			const line = new Konva.Line({
				points: [
					0,
					y,
					width,
					y
				],
				stroke: color,
				strokeWidth: 2
			});
			this.layer.add(line);
		}

		this.layer.draw();
	}

	public getLayer() {
		return this.layer;
	}
}
