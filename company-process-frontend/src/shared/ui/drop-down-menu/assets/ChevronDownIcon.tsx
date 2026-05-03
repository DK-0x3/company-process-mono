import React from 'react';

/**
 * Стрелка вниз для кнопки меню
 * @param rotated - Если true, стрелка перевернута вверх
 * @param size - Размер SVG
 */
const ChevronDown: React.FC<{ rotated?: number; size?: number }> = ({
	rotated,
	size = 16,
}) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		style={{
			transition: 'transform 0.2s ease',
			transform: `rotate(${rotated}deg)`,
		}}
		aria-hidden
	>
		<polyline points="6 9 12 15 18 9" />
	</svg>
);

export default ChevronDown;