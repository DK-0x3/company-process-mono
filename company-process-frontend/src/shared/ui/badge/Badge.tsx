import { SmartIcon } from '@shared/ui/smart-icon/SmartIcon';
import { Tooltip, TooltipProps } from '@shared/ui/tooltip/Tooltip';
import classNames from 'classnames';
import { ReactNode } from 'react';

import styles from './Badge.module.scss';

export interface BadgeProps {
    title: string;
    link: string;
    className?: string;
    tooltip?: ReactNode;
	tooltipProps?: Partial<TooltipProps>;
}

export const Badge = ({
	title,
	link,
	className,
	tooltip,
	tooltipProps,
}: BadgeProps) => {
	const content = (
		<a
			className={classNames(styles.badge, className)}
			href={link}
		>
			{tooltip && <SmartIcon className={styles.icon} iconName={'info'}/>}
			{title}
		</a>
	);

	return tooltip ? (
		<Tooltip
			content={tooltip}
			{...tooltipProps}
		>
			{content}
		</Tooltip>
	) : (
		content
	);
};