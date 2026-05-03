export interface TreeTableElement<T> {
    id: number;
    title: string;
    children?: TreeTableElement<T>[] | null;
    object?: T;
}