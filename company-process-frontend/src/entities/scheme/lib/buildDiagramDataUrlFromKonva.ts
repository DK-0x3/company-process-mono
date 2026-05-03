import { InitSchemeResponse } from '@entities/scheme/api/types';
import { Editor } from '@features/scheme-editor/editor/Editor';
import {
	DEFAULT_CELL_SIZE,
	DEFAULT_COLUMNS,
	DEFAULT_ROWS,
} from '@features/scheme-editor/types/constants';
import { AppDispatch } from '@shared/lib/store/types/AppDispatch';

const waitFrames = async (count = 2) => {
	for (let index = 0; index < count; index += 1) {
		// Нужен рендер-фрейм, чтобы Konva гарантированно завершила отрисовку.
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => resolve());
		});
	}
};

const MAX_DATA_URL_LENGTH = 6_000_000;

export const buildDiagramDataUrlFromKonva = async (args: {
	scheme: InitSchemeResponse | undefined;
	ownerProcessId: number;
	dispatch: AppDispatch;
}): Promise<string | undefined> => {
	const { scheme, ownerProcessId, dispatch } = args;
	if (
		!scheme
		|| (scheme.processes.length === 0 && scheme.tasks.length === 0)
	) {
		return undefined;
	}

	const mount = document.createElement('div');
	mount.style.position = 'fixed';
	mount.style.left = '-20000px';
	mount.style.top = '-20000px';
	mount.style.width = '2200px';
	mount.style.height = '1400px';
	mount.style.opacity = '0';
	mount.style.pointerEvents = 'none';
	mount.style.zIndex = '-1';
	document.body.appendChild(mount);

	const editor = new Editor({
		container: mount,
		cols: DEFAULT_COLUMNS,
		rows: DEFAULT_ROWS,
		cellSize: DEFAULT_CELL_SIZE,
		dispatch,
		ownerProcessId,
	});

	try {
		editor.initSchemeComponents(scheme);
		await waitFrames(3);

		const variants = [
			{
				pixelRatio: 1.5,
				padding: 56,
				hideGrid: true,
				mimeType: 'image/jpeg',
				quality: 0.9,
			},
			{
				pixelRatio: 1.25,
				padding: 52,
				hideGrid: true,
				mimeType: 'image/jpeg',
				quality: 0.82,
			},
			{
				pixelRatio: 1,
				padding: 48,
				hideGrid: true,
				mimeType: 'image/jpeg',
				quality: 0.76,
			},
			{
				pixelRatio: 1,
				padding: 44,
				hideGrid: true,
				mimeType: 'image/png',
				quality: 1,
			},
		] as const;

		for (const variant of variants) {
			const dataUrl = editor.exportSchemeDataUrl(variant);
			if (!dataUrl) {
				continue;
			}
			if (dataUrl.length <= MAX_DATA_URL_LENGTH) {
				return dataUrl;
			}
		}

		// В крайнем случае возвращаем минимальный вариант.
		return editor.exportSchemeDataUrl({
			pixelRatio: 1,
			padding: 40,
			hideGrid: true,
			mimeType: 'image/jpeg',
			quality: 0.7,
		});
	} catch {
		return undefined;
	} finally {
		editor.destroy();
		mount.remove();
	}
};
