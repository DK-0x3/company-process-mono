/**
 * Требования к сущностям с реализацией механизма зависимостей.
 */
interface IDependent<Dependencies> {
	connectDependencies: (dependencies: Dependencies) => void;
	injectDependencies: VoidFunction;
}

export default IDependent;
