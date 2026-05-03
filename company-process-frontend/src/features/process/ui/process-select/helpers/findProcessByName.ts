import { ProcessTree } from '@entities/process/model/types/ProcessTree';

export const findProcessById = (
	processes: ProcessTree[],
	id: number
): ProcessTree | undefined => {
	for (const process of processes) {
		if (process.id === id) {
			return process; // нашли процесс на этом уровне
		}

		// если есть дети — идём рекурсивно внутрь
		if (process.children?.length) {
			const found = findProcessById(process.children, id);
			if (found) return found; // если нашли в поддереве — возвращаем
		}
	}

	return undefined; // если не нашли
};
