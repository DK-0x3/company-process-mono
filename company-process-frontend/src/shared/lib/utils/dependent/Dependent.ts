import type IDependent from './IDependent';

/**
 * Абстрактный класс для управления зависимостями.
 * Реализует механизм внедрения зависимостей и их последующей активации.
 *
 * @template Dependencies Тип внедряемых зависимостей.
 */
abstract class Dependent<Dependencies> implements IDependent<Dependencies> {
	private readonly postInjectDependenciesListeners: ((dependencies: Dependencies) => void)[];

	constructor() {
		this.postInjectDependenciesListeners = [];
	}

	protected privateDependencies: Dependencies | null = null;

	/**
     * Возвращает внедрённые зависимости.
     *
     * @protected
     */
	protected get dependencies(): Dependencies {
		if (this.privateDependencies === null) {
			throw new Error('Dependencies have not been injected.');
		}
		return this.privateDependencies;
	}

	/**
     * Добавляет слушатель события внедрения зависимостей.
     *
     * @param listener Функция, вызываемая после внедрения зависимостей.
     * @protected
     */
	protected addPostInjectDependenciesListener(listener: (dependencies: Dependencies) => void): void {
		this.postInjectDependenciesListeners.push(listener);
	}

	/**
     * Подключает внешние зависимости.
     *
     * @param dependencies Объект с зависимостями.
     * @returns Текущий экземпляр класса.
     * @throws {Error} Если хотя бы одна из переданных зависимостей равна `undefined`.
     */
	public connectDependencies(dependencies: Dependencies): this {
		for (const dependenciesKey in dependencies) {
			if (dependencies[dependenciesKey] === undefined) {
				throw new Error(`Dependency "${dependenciesKey}" is undefined.`);
			}
		}
		this.privateDependencies = { ...dependencies };
		return this;
	}

	/**
     * Принудительно внедряет зависимости и активирует их.
     *
     * @param dependencies Объект с зависимостями.
     * @returns Текущий экземпляр класса.
     */
	public forceInjectDependencies(dependencies: Dependencies): this {
		return this.connectDependencies(dependencies).injectDependencies();
	}

	/**
     * Активирует внедрённые зависимости, вызывая зарегистрированные слушатели.
     *
     * @returns Текущий экземпляр класса.
     * @throws {Error} Если зависимости не были подключены.
     */
	public injectDependencies(): this {
		if (this.privateDependencies === null) {
			throw new Error('Dependencies have not been connected.');
		}
		for (let i = 0; i < this.postInjectDependenciesListeners.length; i++) {
			this.postInjectDependenciesListeners[i]({ ...this.privateDependencies });
		}
		return this;
	}
}

export default Dependent;
