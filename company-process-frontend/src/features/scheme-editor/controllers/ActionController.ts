import { schemeApi } from '@entities/scheme/api/api';
import { ArrowActionConfig, DotActionConfig } from '@entities/scheme/model/types/ArrowActionConfig';
import { ProcessActionConfig } from '@entities/scheme/model/types/ProcessActionConfig';
import { SchemeComponentType } from '@entities/scheme/model/types/SchemeComponentType';
import { TaskActionConfig } from '@entities/scheme/model/types/TaskActionConfig';
import { Arrow } from '@features/scheme-editor/components/arrow/Arrow';
import { Dot } from '@features/scheme-editor/components/dot-arrow/Dot';
import { ProcessComponent } from '@features/scheme-editor/components/process-component/ProcessComponent';
import { TaskComponent } from '@features/scheme-editor/components/task-component/TaskComponent';
import { IBaseComponent } from '@features/scheme-editor/types/IBaseComponent';
import { AppDispatch } from '@shared/lib/store/types/AppDispatch';
import toast from 'react-hot-toast';

export class ActionController {
	constructor(private dispatch: AppDispatch, private ownerProcessId: number) {

	}

	public sendDeleteArrow = (arrow: Arrow) => {
		const arrowActionConfig = arrow.getConfig();

		this.dispatch(schemeApi.endpoints.deleteArrow.initiate({
			ownerProcessId: this.ownerProcessId,
			...arrowActionConfig,
		}));
	};

	public sendCreateArrow = (arrow: Arrow) => {
		const arrowActionConfig = arrow.getConfig();

		this.dispatch(schemeApi.endpoints.createArrow.initiate({
			ownerProcessId: this.ownerProcessId,
			...arrowActionConfig,
		}))
			.unwrap()
			.catch(() => {
				toast.error('Не удалось сохранить связь между компонентами');
			});
	};

	public sendUpdateComponent = (component: IBaseComponent) => {
		const {
			type, id, width, height, wx, wy 
		} = component.getConfiguration();

		this.dispatch(schemeApi.endpoints.updateComponent.initiate({
			ownerProcessId: this.ownerProcessId,
			type,
			componentId: id,
			x: wx,
			y: wy,
			height,
			width,
			}));
	};

	public sendCreateProcessComponent = (component: ProcessComponent) => {
		const {
			wx, wy, width, height 
		} = component.getConfiguration();

		this.dispatch(schemeApi.endpoints.createProcessComponent.initiate({
			ownerProcessId: this.ownerProcessId,
			x: wx,
			y: wy,
			width,
			height,
			processId: component.getProcess().id,
		}))
			.unwrap()
			.then((response) => {
				component.syncPersistedId(response.id);
			})
			.catch(() => {
				toast.error('Не удалось добавить процесс на схему');
			});
	};

	public sendCreateTaskComponent = (component: TaskComponent) => {
		const {
			wx, wy, width, height 
		} = component.getConfiguration();

		this.dispatch(schemeApi.endpoints.createTaskComponent.initiate({
			ownerProcessId: this.ownerProcessId,
			x: wx,
			y: wy,
			width,
			height,
			taskId: component.getTask().id,
		}))
			.unwrap()
			.then((response) => {
				component.syncPersistedId(response.id);
			})
			.catch(() => {
				toast.error('Не удалось добавить задачу на схему');
			});
	};

	/**
	 * Собирает данные со сцены и возвращает готовый объект для Redux payload.
	 */
	public sendInitSchemeAction = (
		processes: ProcessComponent[],
		tasks: TaskComponent[],
		arrows: Arrow[]
	): void => {

		// 1. Преобразуем компоненты процессов
		const processesData: ProcessActionConfig[] = processes.map((comp) => {
			const cfg = comp.getConfiguration();
			return {
				x: cfg.wx,
				y: cfg.wy,
				width: cfg.width,
				height: cfg.height,
				processId: comp.getProcess().id,
			};
		});

		// 2. Преобразуем компоненты задач
		const tasksData: TaskActionConfig[] = tasks.map((comp) => {
			const cfg = comp.getConfiguration();
			return {
				x: cfg.wx,
				y: cfg.wy,
				width: cfg.width,
				height: cfg.height,
				taskId: comp.getTask().id,
			};
		});

		// 3. Преобразуем стрелки
		const arrowsData: ArrowActionConfig[] = arrows.map((arrow) => ({
			fromDot: this.extractDotData(arrow.getDotStart()),
			toDot: this.extractDotData(arrow.getDotEnd()),
		}));

		// return {
		// 	ownerProcessId,
		// 	processes: processesData,
		// 	tasks: tasksData,
		// 	arrows: arrowsData,
		// };
		this.dispatch(schemeApi.endpoints.initScheme.initiate({
			ownerProcessId: this.ownerProcessId,
			processes: processesData,
			tasks: tasksData,
			arrows: arrowsData,
		}))
			.unwrap()
			.then((response) => {
				const processComponentIdByProcessId = new Map<number, number>(
					response.processes.map((item) => [
						item.processId,
						item.id
					])
				);
				const taskComponentIdByTaskId = new Map<number, number>(
					response.tasks.map((item) => [
						item.taskId,
						item.id
					])
				);

				processes.forEach((component) => {
					const processId = component.getProcess().id;
					const persistedComponentId = processComponentIdByProcessId.get(processId);

					if (persistedComponentId) {
						component.syncPersistedId(persistedComponentId);
					}
				});

				tasks.forEach((component) => {
					const taskId = component.getTask().id;
					const persistedComponentId = taskComponentIdByTaskId.get(taskId);

					if (persistedComponentId) {
						component.syncPersistedId(persistedComponentId);
					}
				});
			})
			.catch(() => {
				toast.error('Не удалось сохранить схему');
			});
	};

	/**
	 * Приватный метод для извлечения данных из точки.
	 * Определяет тип родителя и берет нужный ID.
	 */
	private extractDotData(dot: Dot): DotActionConfig {
		const component = dot.getParent();
		let type: SchemeComponentType;
		let parentComponentId: number;
		if (component instanceof ProcessComponent) {
			type = SchemeComponentType.PROCESS;
			parentComponentId = component.getProcess().id;
		} else {
			type = SchemeComponentType.TASK;
			parentComponentId = (component as TaskComponent).getTask().id;
		}

		return {
			side: dot.getSide(),
			offset: dot.getOffset(),
			parentComponentId,
			parentComponentType: type,
		};
	}
}
