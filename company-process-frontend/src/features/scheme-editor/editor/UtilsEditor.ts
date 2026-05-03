import {
	DEFAULT_CELL_SIZE, DEFAULT_COLUMNS, DEFAULT_ROWS 
} from '@features/scheme-editor/types/constants';
import { GridPoint } from '@features/scheme-editor/types/GridPoint';
import { IBaseComponent } from '@features/scheme-editor/types/IBaseComponent';
import { IPosition } from '@features/scheme-editor/types/IPosition';
import { Obstacle } from '@features/scheme-editor/types/Obstacle';
import { WorldPoint } from '@features/scheme-editor/types/WorldPoint';
import Konva from 'konva';

class EditorUtils {
	public halfCols = DEFAULT_COLUMNS / 2;
	public halfRows = DEFAULT_ROWS / 2;

	constructor() {
	}

	public worldToGrid = (p: WorldPoint): GridPoint =>{
		return {
			gx: p.wx + this.halfCols,
			gy: p.wy + this.halfRows,
		};
	};
	
	public gridToWorld = (p: GridPoint): WorldPoint => {
		return {
			wx: p.gx - this.halfCols,
			wy: p.gy - this.halfRows,
		};
	};

	public worldToPixel = (p: WorldPoint): IPosition => {
		const g = this.worldToGrid(p);
		return {
			x: g.gx * DEFAULT_CELL_SIZE,
			y: g.gy * DEFAULT_CELL_SIZE,
		};
	};
	
	public pixelToWorld = (p: IPosition): WorldPoint => {
		const g = this.pixelToGrid(p);
		return this.gridToWorld(g);
	};
	
	public pixelToGrid = (p: IPosition): GridPoint => {
		return {
			gx: Math.round(p.x / DEFAULT_CELL_SIZE),
			gy: Math.round(p.y / DEFAULT_CELL_SIZE),
		};
	};
	
	public gridToPixel = (p: GridPoint): IPosition => {
		return {
			x: p.gx * DEFAULT_CELL_SIZE,
			y: p.gy * DEFAULT_CELL_SIZE,
		};
	};

	public componentToObstacle = (component: IBaseComponent): Obstacle => {
		const c = component.getConfiguration();

		return {
			id: String(component.getConfiguration().id),
			minX: c.wx,
			minY: c.wy,
			maxX: c.wx + c.width,
			maxY: c.wy + c.height,
		};
	};

	public measureTextWidth = (text: string, fontSize: number, fontFamily?: string): number => {
		const tempText = new Konva.Text({
			text: text,
			fontSize: fontSize,
			fontFamily: fontFamily,
		});

		// Метод getTextWidth() возвращает ширину именно текста
		// Метод width() может вернуть 'auto', если не задан явно
		const width = tempText.getTextWidth();

		// Важно: уничтожаем объект, чтобы не было утечек памяти,
		// хотя он и не на слое, у него остаются внутренние связи
		tempText.destroy();

		return width;
	};
}

export const UtilsEditor = new EditorUtils();
