import React from 'react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt?: string;
    className?: string;
    fixedWidth?: number;
    fixedHeight?: number;
}

/**
 * Изображение которое масштабируется по меньшей стороне
 */
export const SmartImage: React.FC<SmartImageProps> = ({
	src, alt = 'img', className, ...rest
}) => {
	return (
		<img
			src={src}
			alt={alt}
			className={className}
			style={{
				width: '100%',
				height: '100%',
				objectFit: 'cover',
				display: 'block',
			}}
			{...rest}
		/>
	);
};
