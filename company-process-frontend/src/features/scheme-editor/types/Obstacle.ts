// Препятствия для стрелок (все данные в world координатах)
export interface Obstacle {
    id: string;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}