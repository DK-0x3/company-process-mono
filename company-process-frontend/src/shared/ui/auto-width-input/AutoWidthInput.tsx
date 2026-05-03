import React, { forwardRef, useLayoutEffect, useRef, useState } from 'react';

interface AutoWidthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    minWidth?: number;
    maxWidth?: number;
}

/**
 * Поле ввода которое автоматически подстраивается под ширину текста или placeholder
 */
export const AutoWidthInput = forwardRef<HTMLInputElement, AutoWidthInputProps>(
	function AutoWidthInput({ value, placeholder, style, minWidth = 40, maxWidth = 400, ...props }, ref) {
		const sizerRef = useRef<HTMLSpanElement>(null);
		const inputRef = useRef<HTMLInputElement>(null);
		const [width, setWidth] = useState<number>(minWidth);

		// пробрасываем внешний ref
		React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

		useLayoutEffect(() => {
			if (sizerRef.current && inputRef.current) {
				const inputStyles = getComputedStyle(inputRef.current);

				// Копируем нужные свойства, влияющие на ширину текста
				const styleProps = [
					'font',
					'fontSize',
					'fontWeight',
					'fontFamily',
					'fontStyle',
					'letterSpacing',
					'textTransform',
					'textIndent',
					'textDecoration',
					'textRendering',
					'textOrientation',
					'whiteSpace',
					'padding',
					'border',
				];

				styleProps.forEach((prop) => {
					(sizerRef.current as HTMLElement).style.setProperty(
						prop,
						inputStyles.getPropertyValue(prop)
					);
				});

				// выставляем текст
				const text = value?.toString() || placeholder || '';
				sizerRef.current.textContent = text;

				// измеряем
				let newWidth = sizerRef.current.offsetWidth + 5; // запас под курсор
				newWidth = Math.max(newWidth, minWidth);
				newWidth = Math.min(newWidth, maxWidth);

				setWidth(newWidth);
			}
		}, [value, placeholder, minWidth, maxWidth]);

		return (
			<div style={{ display: 'inline-block', position: 'relative' }}>
				{/* невидимый измеритель */}
				<span
					ref={sizerRef}
					style={{
						position: 'absolute',
						visibility: 'hidden',
						whiteSpace: 'pre',
					}}
				/>
				{/* сам input */}
				<input
					{...props}
					ref={inputRef}
					value={value as string}
					placeholder={placeholder}
					style={{ ...style, width }}
				/>
			</div>
		);
	}
);


// import React, { useLayoutEffect, useRef, useState } from "react";
//
// interface AutoWidthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
//     minWidth?: number;
//     maxWidth?: number;
// }
//
// /**
//  * Поле ввода которое автоматически подстраивается под ширину текста или placeholder
//  */
// export const AutoWidthInput = React.forwardRef<HTMLInputElement, AutoWidthInputProps>(
//     ({ value, placeholder, style, minWidth = 40, maxWidth = 400, ...props }, ref) => {
//         const sizerRef = useRef<HTMLSpanElement>(null);
//         const inputRef = useRef<HTMLInputElement>(null);
//         const [width, setWidth] = useState<number>(minWidth);
//
//         // пробрасываем внешний ref
//         React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
//
//         useLayoutEffect(() => {
//             if (sizerRef.current && inputRef.current) {
//                 const inputStyles = getComputedStyle(inputRef.current);
//
//                 // Копируем нужные свойства, влияющие на ширину текста
//                 const styleProps = [
//                     "font",
//                     "fontSize",
//                     "fontWeight",
//                     "fontFamily",
//                     "fontStyle",
//                     "letterSpacing",
//                     "textTransform",
//                     "textIndent",
//                     "textDecoration",
//                     "textRendering",
//                     "textOrientation",
//                     "whiteSpace",
//                     "padding",
//                 ];
//
//                 styleProps.forEach((prop) => {
//                     (sizerRef.current as HTMLElement).style.setProperty(
//                         prop,
//                         inputStyles.getPropertyValue(prop)
//                     );
//                 });
//
//                 // выставляем текст
//                 const text = value?.toString() || placeholder || "";
//                 sizerRef.current.textContent = text;
//
//                 // измеряем
//                 let newWidth = sizerRef.current.offsetWidth + 2; // запас под курсор
//                 newWidth = Math.max(newWidth, minWidth);
//                 newWidth = Math.min(newWidth, maxWidth);
//
//                 setWidth(newWidth);
//             }
//         }, [value, placeholder, minWidth, maxWidth]);
//
//         return (
//             <div style={{ display: "inline-block", position: "relative" }}>
//                 {/* невидимый измеритель */}
//                 <span
//                     ref={sizerRef}
//                     style={{
//                         position: "absolute",
//                         visibility: "hidden",
//                         whiteSpace: "pre",
//                     }}
//                 />
//                 {/* сам input */}
//                 <input
//                     {...props}
//                     ref={inputRef}
//                     value={value as string}
//                     placeholder={placeholder}
//                     style={{ ...style, width }}
//                 />
//             </div>
//         );
//     }
// );
