import { FC, SVGProps } from 'react';

import { IconName } from './types/icon-names';

const icons = import.meta.glob('@shared/assets/icons/*.svg', {
	eager: true,
	import: 'default',
});

// Преобразуем пути в удобные имена
const iconsMap = Object.entries(icons).reduce((acc, [path, module]) => {
	const fileName = path.split('/').pop()
		?.replace('.svg', '') || '';
	acc[fileName] = module as FC<SVGProps<SVGSVGElement>>;
	return acc;
}, {} as Record<string, FC<SVGProps<SVGSVGElement>>>);

interface IconProps extends SVGProps<SVGSVGElement> {
	/**
	 * Имя иконки, доступное из папки `shared/assets/icons`.
	 * Автоматически типизируется через `IconName`.
	 *
	 * Пример:
	 * ```tsx
	 * <SmartIcon iconName="react" />
	 * ```
	 */
    iconName: IconName;
}

/**
 * Универсальный компонент для рендеринга SVG-иконок.
 *
 * Иконки берутся из `src/shared/assets/icons`,
 * автоматически подтягиваются через `import.meta.glob`
 * и доступны по имени файла (без `.svg`).
 *
 * Поддерживает все стандартные `SVGProps<SVGSVGElement>`.
 *
 * ---
 *
 * Примеры:
 * ```tsx
 * // Иконка 24px
 * <SmartIcon iconName="react" size={24} />
 *
 * // Красная иконка с кастомным классом
 * <SmartIcon iconName="close" fill="red" className="icon" />
 * ```
 */
export const SmartIcon: FC<IconProps> = ({
	iconName, ...props
}) => {
	const SvgIcon = iconsMap[iconName];

	if (!SvgIcon) {
		console.warn(`Icon "${iconName}" not found in shared/assets/icons`);
		return null;
	}

	return <SvgIcon {...props} />;
};
