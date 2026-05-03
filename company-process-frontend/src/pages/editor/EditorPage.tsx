import { processAPI } from '@entities/process/api/api';
import { processActions } from '@entities/process/model/slice';
import { Process } from '@entities/process/model/types/Process';
import { schemeApi } from '@entities/scheme/api/api';
import { taskActions } from '@entities/task/model/slice';
import { Task } from '@entities/task/model/types/Task';
import { ContextMenuProcessEditor } from '@features/process/ui/context-menu-process-editor/ContextMenuProcessEditor';
import { Editor } from '@features/scheme-editor/editor/Editor';
import {
	DEFAULT_CELL_SIZE, DEFAULT_COLUMNS, DEFAULT_ROWS 
} from '@features/scheme-editor/types/constants';
import { ContextMenuTaskEditor } from '@features/task/ui/context-menu-task-editor/ContextMenuTaskEditor';
import { ContextMenuArrowEditor } from '@pages/editor/ui/context-menu-arrow-editor/ContextMenuArrowEditor';
import { useAppDispatch } from '@shared/lib/store/hooks/useAppDispatch';
import {
	useEffect, useRef, useState 
} from 'react';
import { useParams } from 'react-router-dom';

import styles from './EditorPage.module.scss';

export const EditorPage = () => {
	const { processId } = useParams<{processId: string}>();
	const dispatch = useAppDispatch();
	
	const [isOpenProcessContextMenu, setIsOpenProcessContextMenu] = useState<boolean>(false);
	const [isOpenTaskContextMenu, setIsOpenTaskContextMenu] = useState<boolean>(false);
	const [isOpenArrowContextMenu, setIsOpenArrowContextMenu] = useState<boolean>(false);
	const [isEditorReady, setIsEditorReady] = useState<boolean>(false);

	const containerRef = useRef<HTMLDivElement | null>(null);
	const editorRef = useRef<Editor | null>(null);
	const initializedRef = useRef<boolean>(false);
	const anchorRef = useRef<HTMLDivElement>(null);

	const { data: childrenProcessAndTask, isLoading: isLoadingChildren } = processAPI.useGetChildrenProcessByIdQuery({
		id: Number(processId),
	});

	const { data: scheme, isLoading: isLoadingScheme } = schemeApi.useGetSchemeQuery({
		ownerProcessId: Number(processId),
	});

	useEffect(() => {
		// Если редактор не готов или данные еще грузятся — выходим
		if (!isEditorReady || !editorRef.current || isLoadingScheme || isLoadingChildren) return;
		if (!childrenProcessAndTask) return;

		const processes: Process[] = childrenProcessAndTask.processes.map((child) => ({
			...child,
		}));
		const tasks: Task[] = childrenProcessAndTask.tasks.map((child) => ({
			...child,
		}));

		// 3. Проверяем: есть ли сохраненная схема?
		const hasSavedScheme = scheme && (scheme.processes.length > 0 || scheme.tasks.length > 0);
		if (!initializedRef.current) {
			if (hasSavedScheme) {
				console.log('Загрузка сохраненной схемы...');
				// ВАРИАНТ А: Схема есть в базе -> грузим её
				editorRef.current.initSchemeComponents(scheme);
			} else {
				console.log('Схемы нет, первичная генерация...');
				// ВАРИАНТ Б: Схемы нет -> генерируем с нуля
				editorRef.current.initFirstComponents(processes, tasks);
			}
			initializedRef.current = true;
		}

		editorRef.current.syncWithSource(processes, tasks);

	}, [
		scheme,
		childrenProcessAndTask,
		isLoadingScheme,
		isLoadingChildren,
		processId,
		isEditorReady
	]);

	useEffect(() => {
		if (!containerRef.current) return;
		initializedRef.current = false;
		setIsEditorReady(false);

		const editor = new Editor({
			container: containerRef.current,
			cols: DEFAULT_COLUMNS,
			rows: DEFAULT_ROWS,
			cellSize: DEFAULT_CELL_SIZE,
			dispatch,
			ownerProcessId: Number(processId),
		});

		editor.setOnProcessContextMenu((e, processComponent) => {
			if (!anchorRef.current) return;

			// Получаем координаты курсора
			const { clientX, clientY } = e.evt;

			// Позиционируем невидимый якорь
			anchorRef.current.style.position = 'fixed';
			anchorRef.current.style.left = `${clientX}px`;
			anchorRef.current.style.top = `${clientY}px`;

			// Открываем меню
			setIsOpenProcessContextMenu(true);
			dispatch(processActions.setSelectedProcessEditor(processComponent.getProcess()));
		});
		editor.setOnTaskContextMenu((e, taskComponent) => {
			if (!anchorRef.current) return;

			// Получаем координаты курсора
			const { clientX, clientY } = e.evt;

			// Позиционируем невидимый якорь
			anchorRef.current.style.position = 'fixed';
			anchorRef.current.style.left = `${clientX}px`;
			anchorRef.current.style.top = `${clientY}px`;

			// Открываем меню
			setIsOpenTaskContextMenu(true);
			dispatch(taskActions.setSelectedTaskEditor(taskComponent.getTask()));
		});
		editor.setOnArrowContextMenu((e) => {
			if (!anchorRef.current) return;

			// Получаем координаты курсора
			const { clientX, clientY } = e.evt;

			// Позиционируем невидимый якорь
			anchorRef.current.style.position = 'fixed';
			anchorRef.current.style.left = `${clientX}px`;
			anchorRef.current.style.top = `${clientY}px`;

			// Открываем меню
			setIsOpenArrowContextMenu(true);
		});

		editorRef.current = editor;
		setIsEditorReady(true);

		return () => {
			editorRef.current?.destroy();
			editorRef.current = null;
			initializedRef.current = false;
			setIsEditorReady(false);
		};
	}, [dispatch, processId]);
	
	const onCreateProcess = () => {
		if (!processId) return;

		dispatch(processActions.setOnlyCreateProcessListener((process) => {
			editorRef.current?.runInjectProcess(process);
		}));
		dispatch(processActions.setCreateProcessData({
			name: '',
			parentId: Number(processId),
		}));
		dispatch(processActions.setIsActiveCreateModal(true));
	};

	const onCreateTask = () => {
		if (!processId) return;

		dispatch(taskActions.setOnlyCreateTaskListener((task) => {
			editorRef.current?.runInjectTask(task);
		}));
		dispatch(taskActions.setCreateData({
			name: '',
			processId: Number(processId),
		}));
		dispatch(taskActions.setIsActiveCreateModal(true));
	};

	const onClickUpdateProcess = () => {
		dispatch(processActions.setOnlyUpdateProcessListener((process) => {
			editorRef.current?.updateProcessComponent(process);
		}));
	};

	const onClickCreateProcess = () => {
		dispatch(processActions.setOnlyCreateProcessListener((process) => {
			editorRef.current?.runInjectProcess(process);
		}));
	};

	const onClickCreateTask = () => {
		dispatch(taskActions.setOnlyCreateTaskListener((task) => {
			editorRef.current?.runInjectTask(task);
		}));
	};

	const onClickDeleteProcess = () => {
		dispatch(processActions.setOnlyDeleteProcessListener((process) => {
			editorRef.current?.deleteProcessComponent(process.id);
		}));
	};

	const onClickUpdateTask = () => {
		dispatch(taskActions.setOnlyUpdateTaskListener((task) => {
			editorRef.current?.updateTaskComponent(task);
		}));
	};

	const onClickDeleteTask = () => {
		dispatch(taskActions.setOnlyDeleteTaskListener((task) => {
			editorRef.current?.deleteTaskComponent(task.id);
		}));
	};

	const onClickDeleteArrow = () => {
		editorRef.current?.deleteArrowComponent();
	};

	return (
		<div className={styles.wrapper}>
			<div className={styles.header}>
				<button onClick={onCreateProcess}>
					Создать процесс
				</button>

				<button onClick={onCreateTask}>
					Создать задачу
				</button>
			</div>

			<div ref={containerRef} id="editor" className={styles.editorSurface} />

			<div
				ref={anchorRef}
				style={{
					position: 'fixed',
					width: 1,
					height: 1,
					visibility: 'hidden',
					pointerEvents: 'none',
					zIndex: -1
				}}
			/>

			<ContextMenuProcessEditor
				isOpen={isOpenProcessContextMenu}
				onClose={() => setIsOpenProcessContextMenu(false)}
				ref={anchorRef}
				onClickUpdate={onClickUpdateProcess}
				onClickDelete={onClickDeleteProcess}
				onClickCreateProcess={onClickCreateProcess}
				onClickCreateTask={onClickCreateTask}
			/>
			<ContextMenuTaskEditor
				isOpen={isOpenTaskContextMenu}
				onClose={() => setIsOpenTaskContextMenu(false)}
				ref={anchorRef}
				onClickUpdate={onClickUpdateTask}
				onClickDelete={onClickDeleteTask}
			/>
			<ContextMenuArrowEditor
				isOpen={isOpenArrowContextMenu}
				onClose={() => setIsOpenArrowContextMenu(false)}
				ref={anchorRef}
				onClickDelete={onClickDeleteArrow}
			/>
		</div>
	);
};
